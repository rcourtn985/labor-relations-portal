import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if ((session.user as any).globalRole !== "SYSTEM_ADMIN") {
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
        reviewedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      requests: requests.map((request) => ({
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
        reviewedBy: request.reviewedByUser
          ? {
              id: request.reviewedByUser.id,
              name: request.reviewedByUser.name,
              email: request.reviewedByUser.email,
            }
          : null,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load access requests.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}