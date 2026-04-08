import { randomBytes, createHash } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type RequestStatus = "PENDING" | "APPROVED" | "DENIED";
type MembershipRole = "CHAPTER_ADMIN" | "USER";

type SessionMembership = {
  chapterId: string;
  chapterName: string;
  role: "CHAPTER_ADMIN" | "USER";
};

function toMembershipRole(
  requestedMembershipRole: "CHAPTER_ADMIN" | "USER"
): MembershipRole {
  return requestedMembershipRole === "CHAPTER_ADMIN" ? "CHAPTER_ADMIN" : "USER";
}

function buildInviteToken() {
  const plainToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(plainToken).digest("hex");
  return { plainToken, tokenHash };
}

function getBaseUrl(req: Request): string {
  const envBaseUrl =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (envBaseUrl) {
    return envBaseUrl.replace(/\/+$/, "");
  }

  const url = new URL(req.url);
  return url.origin.replace(/\/+$/, "");
}

function getAdminChapterIds(sessionUser: any): string[] {
  const memberships = ((sessionUser?.memberships ?? []) as SessionMembership[]).filter(
    (membership) => membership.role === "CHAPTER_ADMIN"
  );

  return [
    ...new Set(
      memberships.map((membership) => membership.chapterId).filter(Boolean)
    ),
  ];
}

function isRequestWithinAdminScope(
  requestedChapterIds: string[],
  adminChapterIds: string[]
): boolean {
  if (requestedChapterIds.length === 0) return false;
  return requestedChapterIds.every((chapterId) => adminChapterIds.includes(chapterId));
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isSystemAdmin = (session.user as any).globalRole === "SYSTEM_ADMIN";
  const adminChapterIds = getAdminChapterIds(session.user);
  const isChapterAdmin = adminChapterIds.length > 0;

  if (!isSystemAdmin && !isChapterAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    const status =
      typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
    const adminNotes =
      typeof body.adminNotes === "string" ? body.adminNotes.trim() : "";
    const denialReason =
      typeof body.denialReason === "string" ? body.denialReason.trim() : "";

    if (!["PENDING", "APPROVED", "DENIED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    if (status === "DENIED" && !denialReason) {
      return NextResponse.json(
        { error: "Denial reason is required when denying a request." },
        { status: 400 }
      );
    }

    const existing = await prisma.accessRequest.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        requestedMembershipRole: true,
        requestedChapterId: true,
        status: true,
        requestedChapters: {
          select: {
            chapterId: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Access request not found." },
        { status: 404 }
      );
    }

    const requestedChapterIds = [
      ...new Set(
        [
          ...existing.requestedChapters.map((item) => item.chapterId),
          existing.requestedChapterId,
        ].filter((value): value is string => Boolean(value))
      ),
    ];

    if (
      !isSystemAdmin &&
      !isRequestWithinAdminScope(requestedChapterIds, adminChapterIds)
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (status === "APPROVED") {
      if (requestedChapterIds.length === 0) {
        return NextResponse.json(
          { error: "Approved requests must include at least one requested chapter." },
          { status: 400 }
        );
      }

      if (
        existing.requestedMembershipRole === "USER" &&
        requestedChapterIds.length !== 1
      ) {
        return NextResponse.json(
          {
            error:
              "Member Contractor approvals must include exactly one requested chapter.",
          },
          { status: 400 }
        );
      }

      const chapters = await prisma.chapter.findMany({
        where: {
          id: { in: requestedChapterIds },
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (chapters.length !== requestedChapterIds.length) {
        return NextResponse.json(
          { error: "One or more requested chapters are invalid or inactive." },
          { status: 400 }
        );
      }
    }

    const baseUrl = getBaseUrl(req);
    const { plainToken, tokenHash } = buildInviteToken();
    const inviteExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const result = await prisma.$transaction(async (tx) => {
      let provisionedUserId: string | null = null;
      let activationUrl: string | null = null;

      if (status === "APPROVED") {
        const membershipRole = toMembershipRole(existing.requestedMembershipRole);

        const existingUser = await tx.user.findUnique({
          where: { email: existing.email },
          select: {
            id: true,
            deletedAt: true,
            accountStatus: true,
          },
        });

        let userId: string;

        if (existingUser && !existingUser.deletedAt) {
          const updatedUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              firstName: existing.firstName || null,
              lastName: existing.lastName || null,
              name: [existing.firstName, existing.lastName].filter(Boolean).join(" "),
              phone: existing.phone || null,
              accountStatus:
                existingUser.accountStatus === "ACTIVE" ? "ACTIVE" : "INVITED",
            },
            select: {
              id: true,
            },
          });

          userId = updatedUser.id;
        } else {
          const createdUser = await tx.user.create({
            data: {
              email: existing.email,
              firstName: existing.firstName || null,
              lastName: existing.lastName || null,
              name: [existing.firstName, existing.lastName].filter(Boolean).join(" "),
              phone: existing.phone || null,
              globalRole: "STANDARD",
              accountStatus: "INVITED",
            },
            select: {
              id: true,
            },
          });

          userId = createdUser.id;
        }

        provisionedUserId = userId;

        const existingMemberships = await tx.chapterMembership.findMany({
          where: {
            userId,
            chapterId: { in: requestedChapterIds },
          },
          select: {
            id: true,
            chapterId: true,
          },
        });

        const existingMembershipMap = new Map(
          existingMemberships.map((membership) => [membership.chapterId, membership])
        );

        for (const chapterId of requestedChapterIds) {
          const existingMembership = existingMembershipMap.get(chapterId);

          if (existingMembership) {
            await tx.chapterMembership.update({
              where: { id: existingMembership.id },
              data: {
                role: membershipRole,
                isActive: true,
              },
            });
          } else {
            await tx.chapterMembership.create({
              data: {
                userId,
                chapterId,
                role: membershipRole,
                isActive: true,
              },
            });
          }
        }

        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            accountStatus: true,
          },
        });

        if (user?.accountStatus !== "ACTIVE") {
          await tx.userInviteToken.updateMany({
            where: {
              userId,
              usedAt: null,
            },
            data: {
              usedAt: new Date(),
            },
          });

          await tx.userInviteToken.create({
            data: {
              userId,
              tokenHash,
              expiresAt: inviteExpiresAt,
            },
          });

          activationUrl = `${baseUrl}/activate-account?token=${encodeURIComponent(
            plainToken
          )}`;
        }
      }

      const updatedRequest = await tx.accessRequest.update({
        where: { id },
        data: {
          status: status as RequestStatus,
          adminNotes: adminNotes || null,
          denialReason: status === "DENIED" ? denialReason : null,
          reviewedAt: new Date(),
          reviewedByUserId: (session.user as any).id,
        },
        select: {
          id: true,
          status: true,
          reviewedAt: true,
        },
      });

      return {
        updatedRequest,
        provisionedUserId,
        activationUrl,
      };
    });

    return NextResponse.json({
      ok: true,
      request: {
        id: result.updatedRequest.id,
        status: result.updatedRequest.status,
        reviewedAt: result.updatedRequest.reviewedAt?.toISOString() ?? null,
      },
      provisionedUserId: result.provisionedUserId,
      activationUrl: result.activationUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update access request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const isSystemAdmin = (session.user as any).globalRole === "SYSTEM_ADMIN";
  const adminChapterIds = getAdminChapterIds(session.user);
  const isChapterAdmin = adminChapterIds.length > 0;

  if (!isSystemAdmin && !isChapterAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.accessRequest.findUnique({
      where: { id },
      select: {
        id: true,
        requestedChapterId: true,
        requestedChapters: {
          select: {
            chapterId: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Access request not found." },
        { status: 404 }
      );
    }

    const requestedChapterIds = [
      ...new Set(
        [
          ...existing.requestedChapters.map((item) => item.chapterId),
          existing.requestedChapterId,
        ].filter((value): value is string => Boolean(value))
      ),
    ];

    if (
      !isSystemAdmin &&
      !isRequestWithinAdminScope(requestedChapterIds, adminChapterIds)
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.accessRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      deletedRequestId: id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete access request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}