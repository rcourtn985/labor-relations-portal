import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isSystemAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SHARED_CBAS_KB_ID = "cbas_shared";

function normalizeQuery(value: string | null): string {
  return (value ?? "").trim();
}

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeKey(value: string | null | undefined): string {
  return normalizeValue(value).toLowerCase();
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

function buildAgreementDedupKey(row: {
  filename: string;
  chapter: string;
  localUnion: string;
  agreementType: string;
  states: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}): string {
  return [
    normalizeKey(row.filename),
    normalizeKey(row.chapter),
    normalizeKey(row.localUnion),
    normalizeKey(row.agreementType),
    normalizeKey(row.states),
    normalizeKey(row.effectiveFrom),
    normalizeKey(row.effectiveTo),
  ].join("||");
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const q = normalizeQuery(request.nextUrl.searchParams.get("q"));

    if (!q) {
      return NextResponse.json({ query: "", results: [] });
    }

    const userMemberships = session.user.memberships ?? [];
    const isUserSystemAdmin = isSystemAdmin(session);

    const chapterAdminChapterNames = userMemberships
      .filter((membership) => membership.role === "CHAPTER_ADMIN")
      .map((membership) => normalizeValue(membership.chapterName))
      .filter(Boolean);

    const normalizedManagedChapterNames = new Set(
      chapterAdminChapterNames.map((name) => normalizeKey(name))
    );

    const canManageAgreements =
      isUserSystemAdmin || normalizedManagedChapterNames.size > 0;

    const documents = await prisma.document.findMany({
      where: {
        isCba: true,
        deletedAt: null,
        textContent: {
          is: {
            extractedText: {
              contains: q,
              mode: "insensitive",
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
        kbId: true,
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

    const preferredAgreementNameByFilename = new Map<string, string>();

    for (const doc of documents) {
      const filenameKey = normalizeKey(doc.filename);
      if (!filenameKey) continue;
      if (doc.kbId === SHARED_CBAS_KB_ID) continue;

      const kbName = normalizeValue(doc.kb?.name);
      if (!kbName) continue;

      if (!preferredAgreementNameByFilename.has(filenameKey)) {
        preferredAgreementNameByFilename.set(filenameKey, kbName);
      }
    }

    const visibleDocuments = documents.filter((doc) => {
      if (isUserSystemAdmin) return true;
      if (!canManageAgreements) return true;
      if (doc.sharedToCbas) return true;

      return normalizedManagedChapterNames.has(normalizeKey(doc.chapter));
    });

    const mappedResults = visibleDocuments.map((doc) => {
      const filename = doc.filename ?? "";
      const filenameKey = normalizeKey(filename);

      const preferredAgreementName =
        preferredAgreementNameByFilename.get(filenameKey) ?? null;

      const agreementName =
        preferredAgreementName ||
        normalizeValue(doc.kb?.name) ||
        "(untitled agreement)";

      return {
        id: doc.id,
        agreementName,
        collectionId: doc.kb?.id ?? "",
        filename,
        uploadedAt: Math.floor(doc.createdAt.getTime() / 1000),
        chapter: doc.chapter ?? "",
        localUnion: doc.localUnion ?? "",
        agreementType: doc.cbaType ?? "",
        states: doc.state ?? "",
        sharedToCbas: Boolean(doc.sharedToCbas),
        effectiveFrom: doc.effectiveFrom ? doc.effectiveFrom.toISOString() : null,
        effectiveTo: doc.effectiveTo ? doc.effectiveTo.toISOString() : null,
        snippet: createSnippet(doc.textContent?.extractedText ?? "", q),
        extractionState: doc.textContent?.extractionState ?? "missing",
        extractedAt: doc.textContent?.extractedAt
          ? Math.floor(doc.textContent.extractedAt.getTime() / 1000)
          : null,
      };
    });

    const rowsForDedup = [...mappedResults].sort((a, b) => {
      if (a.sharedToCbas !== b.sharedToCbas) {
        return a.sharedToCbas ? 1 : -1;
      }
      return b.uploadedAt - a.uploadedAt;
    });

    const dedupedMap = new Map<string, (typeof mappedResults)[number]>();

    for (const row of rowsForDedup) {
      const key = buildAgreementDedupKey(row);
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, row);
      }
    }

    const results = Array.from(dedupedMap.values()).sort(
      (a, b) => b.uploadedAt - a.uploadedAt
    );

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