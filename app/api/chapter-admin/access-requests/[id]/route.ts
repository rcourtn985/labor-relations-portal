import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const memberships = ((session.user as any).memberships ?? []) as Array<{
    chapterId: string;
    chapterName: string;
    role: "CHAPTER_ADMIN" | "USER";
  }>;

  const adminChapterIds = memberships
    .filter((membership) => membership.role === "CHAPTER_ADMIN")
    .map((membership) => membership.chapterId);

  if (adminChapterIds.length === 0) {
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

    const existing = await prisma.accessRequest.findFirst({
      where: {
        id,
        requestedMembershipRole: "USER",
        requestedChapterId: {
          in: adminChapterIds,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Access request not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.accessRequest.update({
      where: { id },
      data: {
        status: status as "PENDING" | "APPROVED" | "DENIED",
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

    return NextResponse.json({
      ok: true,
      request: {
        id: updated.id,
        status: updated.status,
        reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update access request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}