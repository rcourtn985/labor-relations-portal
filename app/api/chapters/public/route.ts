import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const chapters = await prisma.chapter.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    return NextResponse.json({ chapters });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load chapters.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}