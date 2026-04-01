import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type MembershipInput = {
  chapterId: string;
  role: "CHAPTER_ADMIN" | "USER";
};

type PatchBody = {
  accountStatus?: string;
  globalRole?: string;
  memberships?: Array<{
    chapterId?: unknown;
    role?: unknown;
  }>;
};

const VALID_ACCOUNT_STATUSES = new Set([
  "INVITED",
  "ACTIVE",
  "DENIED",
  "DISABLED",
] as const);

const VALID_GLOBAL_ROLES = new Set(["SYSTEM_ADMIN", "STANDARD"] as const);

const VALID_MEMBERSHIP_ROLES = new Set([
  "CHAPTER_ADMIN",
  "USER",
] as const);

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if ((session.user as any).globalRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = (await req.json()) as PatchBody;

    const accountStatus =
      typeof body.accountStatus === "string"
        ? body.accountStatus.trim().toUpperCase()
        : "";

    const globalRole =
      typeof body.globalRole === "string"
        ? body.globalRole.trim().toUpperCase()
        : "";

    const membershipsInput = Array.isArray(body.memberships)
      ? body.memberships
      : [];

    if (!VALID_ACCOUNT_STATUSES.has(accountStatus as never)) {
      return NextResponse.json(
        { error: "Invalid account status." },
        { status: 400 }
      );
    }

    if (!VALID_GLOBAL_ROLES.has(globalRole as never)) {
      return NextResponse.json(
        { error: "Invalid global role." },
        { status: 400 }
      );
    }

    const normalizedMemberships: MembershipInput[] = membershipsInput.map(
      (membership): MembershipInput => {
        const chapterId =
          typeof membership.chapterId === "string"
            ? membership.chapterId.trim()
            : "";

        const roleRaw =
          typeof membership.role === "string"
            ? membership.role.trim().toUpperCase()
            : "";

        if (!chapterId) {
          throw new Error("Each membership must include a chapterId.");
        }

        if (!VALID_MEMBERSHIP_ROLES.has(roleRaw as never)) {
          throw new Error("Invalid chapter membership role.");
        }

        return {
          chapterId,
          role: roleRaw as MembershipInput["role"],
        };
      }
    );

    const chapterIds: string[] = normalizedMemberships.map(
      (membership) => membership.chapterId
    );
    const uniqueChapterIds = [...new Set(chapterIds)];

    if (uniqueChapterIds.length !== chapterIds.length) {
      return NextResponse.json(
        { error: "Duplicate chapter assignments are not allowed." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!existingUser || existingUser.deletedAt) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const chapters = await prisma.chapter.findMany({
      where: {
        id: { in: uniqueChapterIds },
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (chapters.length !== uniqueChapterIds.length) {
      return NextResponse.json(
        { error: "One or more selected chapters are invalid or inactive." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          accountStatus: accountStatus as
            | "INVITED"
            | "ACTIVE"
            | "DENIED"
            | "DISABLED",
          globalRole: globalRole as "SYSTEM_ADMIN" | "STANDARD",
        },
      });

      const existingMemberships = await tx.chapterMembership.findMany({
        where: { userId: id },
        select: {
          id: true,
          chapterId: true,
          role: true,
          isActive: true,
        },
      });

      const requestedByChapterId = new Map<string, MembershipInput>(
        normalizedMemberships.map((membership) => [
          membership.chapterId,
          membership,
        ])
      );

      for (const existingMembership of existingMemberships) {
        const requestedMembership = requestedByChapterId.get(
          existingMembership.chapterId
        );

        if (requestedMembership) {
          await tx.chapterMembership.update({
            where: { id: existingMembership.id },
            data: {
              role: requestedMembership.role,
              isActive: true,
            },
          });
        } else {
          await tx.chapterMembership.update({
            where: { id: existingMembership.id },
            data: {
              isActive: false,
            },
          });
        }
      }

      const existingChapterIds = new Set<string>(
        existingMemberships.map(
          (membership) => membership.chapterId
        )
      );

      for (const requestedMembership of normalizedMemberships) {
        if (!existingChapterIds.has(requestedMembership.chapterId)) {
          await tx.chapterMembership.create({
            data: {
              userId: id,
              chapterId: requestedMembership.chapterId,
              role: requestedMembership.role,
              isActive: true,
            },
          });
        }
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        globalRole: true,
        accountStatus: true,
        updatedAt: true,
        chapterMemberships: {
          where: {
            isActive: true,
            chapter: {
              deletedAt: null,
            },
          },
          orderBy: [{ chapter: { name: "asc" } }],
          select: {
            id: true,
            chapterId: true,
            role: true,
            isActive: true,
            chapter: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      user: updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            name:
              updatedUser.name?.trim() ||
              [updatedUser.firstName, updatedUser.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            phone: updatedUser.phone,
            globalRole: updatedUser.globalRole,
            accountStatus: updatedUser.accountStatus,
            updatedAt: updatedUser.updatedAt.toISOString(),
            memberships: updatedUser.chapterMemberships.map((membership) => ({
              id: membership.id,
              chapterId: membership.chapterId,
              role: membership.role,
              isActive: membership.isActive,
              chapter: membership.chapter
                ? {
                    id: membership.chapter.id,
                    name: membership.chapter.name,
                    code: membership.chapter.code,
                  }
                : null,
            })),
          }
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}