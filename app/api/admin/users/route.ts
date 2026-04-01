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
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        globalRole: true,
        accountStatus: true,
        createdAt: true,
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
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name:
          user.name?.trim() ||
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        globalRole: user.globalRole,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        memberships: user.chapterMemberships.map((membership) => ({
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
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load users.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}