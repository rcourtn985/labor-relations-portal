import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SYSTEM_KB_IDS = new Set(["cbas_shared"]);

function normalizeQuery(value: string | null): string {
  return (value ?? "").trim();
}

function createSnippet(text: string, query: string, radius = 140): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    const fallback = text.trim().slice(0, radius * 2);
    return fallback.length < text.trim().length ? `${fallback}…` : fallback;
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + query.length + radius);

  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const q = normalizeQuery(request.nextUrl.searchParams.get("q"));

    if (!q) {
      return NextResponse.json({ query: "", results: [] });
    }

    const documents = await prisma.document.findMany({
      where: {
        isCba: true,
        NOT: {
          kbId: { in: Array.from(SYSTEM_KB_IDS) },
        },
        textContent: {
          is: {
            extractedText: {
              contains: q,
            },
          },
        },
      },
      select: {
        id: true,
        filename: true,
        createdAt: true,
        chapter: true,
        localUnion: true,
        cbaType: true,
        state: true,
        sharedToCbas: true,
        effectiveFrom: true,
        effectiveTo: true,
        kb: {
          select: {
            id: true,
            name: true,
          },
        },
        textContent: {
          select: {
            extractedText: true,
            extractionState: true,
            extractedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const results = documents.map((doc) => ({
      id: doc.id,
      agreementName: doc.kb?.name ?? "(untitled agreement)",
      collectionId: doc.kb?.id ?? "",
      filename: doc.filename,
      uploadedAt: Math.floor(doc.createdAt.getTime() / 1000),
      chapter: doc.chapter ?? "",
      localUnion: doc.localUnion ?? "",
      agreementType: doc.cbaType ?? "",
      states: doc.state ?? "",
      sharedToCbas: doc.sharedToCbas,
      effectiveFrom: doc.effectiveFrom ? doc.effectiveFrom.toISOString() : null,
      effectiveTo: doc.effectiveTo ? doc.effectiveTo.toISOString() : null,
      snippet: createSnippet(doc.textContent?.extractedText ?? "", q),
      extractionState: doc.textContent?.extractionState ?? "missing",
      extractedAt: doc.textContent?.extractedAt
        ? Math.floor(doc.textContent.extractedAt.getTime() / 1000)
        : null,
    }));

    return NextResponse.json({
      query: q,
      count: results.length,
      results,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
