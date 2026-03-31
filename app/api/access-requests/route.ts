import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SITE_ADMIN_EMAIL = "site-admin-placeholder@example.com";

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
    const requestedChapterId =
      typeof body.requestedChapterId === "string"
        ? body.requestedChapterId.trim()
        : "";
    const requestedMembershipRole =
      typeof body.requestedMembershipRole === "string"
        ? body.requestedMembershipRole.trim().toUpperCase()
        : "";
    const comments =
      typeof body.comments === "string" ? body.comments.trim() : "";

    if (!firstName) {
      return NextResponse.json({ error: "First Name is required." }, { status: 400 });
    }

    if (!lastName) {
      return NextResponse.json({ error: "Last Name is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!requestedChapterId) {
      return NextResponse.json({ error: "Chapter is required." }, { status: 400 });
    }

    if (!["USER", "CHAPTER_ADMIN"].includes(requestedMembershipRole)) {
      return NextResponse.json(
        { error: "Requested access type is required." },
        { status: 400 }
      );
    }

    const chapter = await prisma.chapter.findFirst({
      where: {
        id: requestedChapterId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!chapter) {
      return NextResponse.json(
        { error: "Selected Chapter is invalid." },
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

    const accessRequest = await prisma.accessRequest.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        requestedChapterId,
        requestedMembershipRole:
          requestedMembershipRole as "USER" | "CHAPTER_ADMIN",
        comments: comments || null,
        status: "PENDING",
      },
      select: {
        id: true,
        email: true,
        status: true,
        submittedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      accessRequest,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}