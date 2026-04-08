import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionMembership = {
  chapterId: string;
  chapterName: string;
  role: "CHAPTER_ADMIN" | "USER";
};

function getAdminChapterIds(sessionUser: any): string[] {
  const memberships = ((sessionUser?.memberships ?? []) as SessionMembership[]).filter(
    (membership) => membership.role === "CHAPTER_ADMIN"
  );

  return [...new Set(memberships.map((membership) => membership.chapterId).filter(Boolean))];
}

export async function GET() {
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

  try {
    const requests = await prisma.accessRequest.findMany({
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      include: {
        requestedChapter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        requestedChapters: {
          select: {
            chapterId: true,
            chapter: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          orderBy: {
            chapter: {
              name: "asc",
            },
          },
        },
        reviewedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const filteredRequests = isSystemAdmin
      ? requests
      : requests.filter((request) => {
          const requestedChapterIds = [
            ...new Set(
              [
                ...request.requestedChapters.map((item) => item.chapterId),
                request.requestedChapterId,
              ].filter((value): value is string => Boolean(value))
            ),
          ];

          if (requestedChapterIds.length === 0) {
            return false;
          }

          return requestedChapterIds.every((chapterId) =>
            adminChapterIds.includes(chapterId)
          );
        });

    return NextResponse.json({
      requests: filteredRequests.map((request) => {
        const requestedChapters = request.requestedChapters
          .map((item) => item.chapter)
          .filter(Boolean);

        return {
          id: request.id,
          firstName: request.firstName,
          lastName: request.lastName,
          email: request.email,
          phone: request.phone,
          comments: request.comments,
          requestedMembershipRole: request.requestedMembershipRole,
          status: request.status,
          submittedAt: request.submittedAt.toISOString(),
          reviewedAt: request.reviewedAt?.toISOString() ?? null,
          denialReason: request.denialReason,
          adminNotes: request.adminNotes,
          chapter: request.requestedChapter
            ? {
                id: request.requestedChapter.id,
                name: request.requestedChapter.name,
                code: request.requestedChapter.code,
              }
            : null,
          requestedChapters: requestedChapters.map((chapter) => ({
            id: chapter.id,
            name: chapter.name,
            code: chapter.code,
          })),
          reviewedBy: request.reviewedByUser
            ? {
                id: request.reviewedByUser.id,
                name: request.reviewedByUser.name,
                email: request.reviewedByUser.email,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load access requests.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}