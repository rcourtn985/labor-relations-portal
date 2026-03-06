import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const systemKbs = await prisma.knowledgeBase.findMany({
      where: { visibility: "SYSTEM" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, vectorStoreId: true },
    });

    const central = systemKbs.find((k) => k.id === "central") ?? null;
    if (!central) {
      return NextResponse.json(
        { error: "System KB missing: central (run seed?)" },
        { status: 500 }
      );
    }

    const userKbs = await prisma.knowledgeBase.findMany({
      where: { visibility: { not: "SYSTEM" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, vectorStoreId: true },
    });

    return NextResponse.json({
      central,
      systemKbs, // <-- new: includes central + cbas_shared (and any future system KBs)
      userKbs,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to list KBs" },
      { status: 500 }
    );
  }
}