import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const docs = await prisma.document.findMany({
      where: {
        isCba: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        filename: true,
        chapter: true,
        localUnion: true,
        cbaType: true,
        state: true,
        createdAt: true,
        kb: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      count: docs.length,
      agreements: docs.map((doc) => ({
        id: doc.id,
        agreementName: doc.kb?.name ?? "",
        kbId: doc.kb?.id ?? "",
        filename: doc.filename ?? "",
        chapter: doc.chapter ?? "",
        localUnion: doc.localUnion ?? "",
        agreementType: doc.cbaType ?? "",
        states: doc.state ?? "",
        createdAt: doc.createdAt,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}