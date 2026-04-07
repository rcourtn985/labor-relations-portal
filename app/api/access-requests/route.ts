import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SITE_ADMIN_EMAIL = "site-admin-placeholder@example.com";

type RequestedMembershipRole = "USER" | "CHAPTER_ADMIN";

function normalizeRequestedChapterIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
  )];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const requestedMembershipRole =
      typeof body.requestedMembershipRole === "string"
        ? body.requestedMembershipRole.trim().toUpperCase()
        : "";
    const comments =
      typeof body.comments === "string" ? body.comments.trim() : "";

    const requestedChapterIds = normalizeRequestedChapterIds(
      body.requestedChapterIds
    );

    if (!firstName) {
      return NextResponse.json({ error: "First Name is required." }, { status: 400 });
    }

    if (!lastName) {
      return NextResponse.json({ error: "Last Name is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!["USER", "CHAPTER_ADMIN"].includes(requestedMembershipRole)) {
      return NextResponse.json(
        { error: "Requested access type is required." },
        { status: 400 }
      );
    }

    if (requestedChapterIds.length === 0) {
      return NextResponse.json(
        { error: "At least one Chapter is required." },
        { status: 400 }
      );
    }

    if (
      requestedMembershipRole === "USER" &&
      requestedChapterIds.length !== 1
    ) {
      return NextResponse.json(
        { error: "Member Contractor requests must include exactly one Chapter." },
        { status: 400 }
      );
    }

    const chapters = await prisma.chapter.findMany({
      where: {
        id: { in: requestedChapterIds },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (chapters.length !== requestedChapterIds.length) {
      return NextResponse.json(
        { error: "One or more selected Chapters are invalid." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        accountStatus: true,
        deletedAt: true,
      },
    });

    if (existingUser && !existingUser.deletedAt) {
      if (
        existingUser.accountStatus === "ACTIVE" ||
        existingUser.accountStatus === "INVITED"
      ) {
        return NextResponse.json(
          {
            error:
              "An account for this email already exists. Please sign in or reset your password.",
          },
          { status: 409 }
        );
      }

      if (existingUser.accountStatus === "DENIED") {
        return NextResponse.json(
          {
            error: `This account has been denied. Please contact the site administrator at ${SITE_ADMIN_EMAIL}.`,
          },
          { status: 409 }
        );
      }

      if (existingUser.accountStatus === "DISABLED") {
        return NextResponse.json(
          {
            error: `This account is not active. Please contact the site administrator at ${SITE_ADMIN_EMAIL}.`,
          },
          { status: 409 }
        );
      }
    }

    const latestRequest = await prisma.accessRequest.findFirst({
      where: { email },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        status: true,
      },
    });

    if (latestRequest) {
      if (latestRequest.status === "PENDING") {
        return NextResponse.json(
          {
            error: `This account is pending review. Please contact the site administrator at ${SITE_ADMIN_EMAIL}.`,
          },
          { status: 409 }
        );
      }

      if (latestRequest.status === "DENIED") {
        return NextResponse.json(
          {
            error: `This account has been denied. Please contact the site administrator at ${SITE_ADMIN_EMAIL}.`,
          },
          { status: 409 }
        );
      }

      if (latestRequest.status === "APPROVED") {
        return NextResponse.json(
          {
            error:
              "An account for this email has already been approved. Please sign in or reset your password.",
          },
          { status: 409 }
        );
      }
    }

    const primaryRequestedChapterId = requestedChapterIds[0] ?? null;

    const accessRequest = await prisma.accessRequest.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        requestedChapterId: primaryRequestedChapterId,
        requestedMembershipRole:
          requestedMembershipRole as RequestedMembershipRole,
        comments: comments || null,
        status: "PENDING",
        requestedChapters: {
          create: requestedChapterIds.map((chapterId) => ({
            chapterId,
          })),
        },
      },
      select: {
        id: true,
        email: true,
        status: true,
        submittedAt: true,
        requestedChapterId: true,
        requestedChapters: {
          select: {
            chapterId: true,
          },
          orderBy: {
            chapterId: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      accessRequest: {
        id: accessRequest.id,
        email: accessRequest.email,
        status: accessRequest.status,
        submittedAt: accessRequest.submittedAt,
        requestedChapterId: accessRequest.requestedChapterId,
        requestedChapterIds: accessRequest.requestedChapters.map(
          (chapter) => chapter.chapterId
        ),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}