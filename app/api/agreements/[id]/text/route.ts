import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing agreement id." }, { status: 400 });
    }

    const doc = await prisma.document.findUnique({
      where: { id },
      select: {
        textContent: {
          select: {
            extractedText: true,
            extractionState: true,
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
    }

    return NextResponse.json({
      extractedText: doc.textContent?.extractedText ?? null,
      extractionState: doc.textContent?.extractionState ?? "missing",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
