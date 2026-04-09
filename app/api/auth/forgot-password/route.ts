import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getAppBaseUrl(req: Request): string {
  const configuredBaseUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  const url = new URL(req.url);
  return url.origin;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const genericMessage =
      "If an eligible account exists for that email address, a password reset link has been generated.";

    const user = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        accountStatus: true,
        passwordHash: true,
      },
    });

    if (
      !user ||
      user.accountStatus !== "ACTIVE" ||
      !user.passwordHash
    ) {
      return NextResponse.json({
        ok: true,
        message: genericMessage,
      });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          usedAt: now,
        },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const resetLink = `${getAppBaseUrl(req)}/reset-password?token=${encodeURIComponent(
      rawToken
    )}`;

    return NextResponse.json({
      ok: true,
      message: genericMessage,
      resetLink: process.env.NODE_ENV === "production" ? undefined : resetLink,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process password reset request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}