import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isSystemAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type AgreementSort =
  | "uploaded_desc"
  | "uploaded_asc"
  | "name_asc"
  | "name_desc"
  | "chapter_asc"
  | "chapter_desc"
  | "local_union_asc"
  | "local_union_desc"
  | "agreement_type_asc"
  | "agreement_type_desc"
  | "states_asc"
  | "states_desc"
  | "effective_desc"
  | "effective_asc";

const SHARED_CBAS_KB_ID = "cbas_shared";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT: AgreementSort = "uploaded_desc";

function normalizeQuery(value: string | null): string {
  return (value ?? "").trim();
}

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeKey(value: string | null | undefined): string {
  return normalizeValue(value).toLowerCase();
}

function splitCommaSeparated(value: string | null | undefined): string[] {
  return normalizeValue(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
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

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max?: number
): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  if (typeof max === "number") {
    return Math.min(parsed, max);
  }

  return parsed;
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return fallback;
}

function parseMultiParam(searchParams: URLSearchParams, key: string): string[] {
  return searchParams
    .getAll(key)
    .map((value) => value.trim())
    .filter(Boolean);
}

function matchesSingle(value: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.includes(value);
}

function matchesMultiValue(value: string, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const parts = splitCommaSeparated(value);
  return parts.some((part) => selected.includes(part));
}

function parseSort(value: string | null): AgreementSort {
  switch (value) {
    case "uploaded_asc":
    case "name_asc":
    case "name_desc":
    case "chapter_asc":
    case "chapter_desc":
    case "local_union_asc":
    case "local_union_desc":
    case "agreement_type_asc":
    case "agreement_type_desc":
    case "states_asc":
    case "states_desc":
    case "effective_desc":
    case "effective_asc":
      return value;
    case "uploaded_desc":
    default:
      return DEFAULT_SORT;
  }
}

function compareNullableDatesDesc(a: string | null, b: string | null): number {
  const aTime = a ? new Date(a).getTime() : Number.NEGATIVE_INFINITY;
  const bTime = b ? new Date(b).getTime() : Number.NEGATIVE_INFINITY;
  return bTime - aTime;
}

function compareNullableDatesAsc(a: string | null, b: string | null): number {
  const aTime = a ? new Date(a).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b ? new Date(b).getTime() : Number.POSITIVE_INFINITY;
  return aTime - bTime;
}

function sortRows<T extends {
  uploadedAt: number;
  agreementName: string;
  chapter: string;
  localUnion: string;
  agreementType: string;
  states: string;
  effectiveFrom: string | null;
}>(rows: T[], sort: AgreementSort): T[] {
  const copy = [...rows];

  copy.sort((a, b) => {
    switch (sort) {
      case "uploaded_asc":
        return a.uploadedAt - b.uploadedAt;

      case "uploaded_desc":
        return b.uploadedAt - a.uploadedAt;

      case "name_asc": {
        const byName = a.agreementName.localeCompare(b.agreementName);
        if (byName !== 0) return byName;
        return b.uploadedAt - a.uploadedAt;
      }

      case "name_desc": {
        const byName = b.agreementName.localeCompare(a.agreementName);
        if (byName !== 0) return byName;
        return b.uploadedAt - a.uploadedAt;
      }

      case "chapter_asc": {
        const byChapter = a.chapter.localeCompare(b.chapter);
        if (byChapter !== 0) return byChapter;
        return a.agreementName.localeCompare(b.agreementName);
      }

      case "chapter_desc": {
        const byChapter = b.chapter.localeCompare(a.chapter);
        if (byChapter !== 0) return byChapter;
        return a.agreementName.localeCompare(b.agreementName);
      }

      case "local_union_asc": {
        const byLocal = a.localUnion.localeCompare(b.localUnion);
        if (byLocal !== 0) return byLocal;
        return a.agreementName.localeCompare(b.agreementName);
      }

      case "local_union_desc": {
        const byLocal = b.localUnion.localeCompare(a.localUnion);
        if (byLocal !== 0) return byLocal;
        return a.agreementName.localeCompare(b.agreementName);
      }

      case "agreement_type_asc": {
        const byType = a.agreementType.localeCompare(b.agreementType);
        if (byType !== 0) return byType;
        return a.agreementName.localeCompare(b.agreementName);
      }

      case "agreement_type_desc": {
        const byType = b.agreementType.localeCompare(a.agreementType);
        if (byType !== 0) return byType;
        return a.agreementName.localeCompare(b.agreementName);
      }

      case "states_asc": {
        const byStates = a.states.localeCompare(b.states);
        if (byStates !== 0) return byStates;
        return a.agreementName.localeCompare(b.agreementName);
      }

      case "states_desc": {
        const byStates = b.states.localeCompare(a.states);
        if (byStates !== 0) return byStates;
        return a.agreementName.localeCompare(b.agreementName);
      }

      case "effective_asc": {
        const byEffective = compareNullableDatesAsc(a.effectiveFrom, b.effectiveFrom);
        if (byEffective !== 0) return byEffective;
        return a.agreementName.localeCompare(b.agreementName);
      }

      case "effective_desc": {
        const byEffective = compareNullableDatesDesc(a.effectiveFrom, b.effectiveFrom);
        if (byEffective !== 0) return byEffective;
        return a.agreementName.localeCompare(b.agreementName);
      }

      default:
        return b.uploadedAt - a.uploadedAt;
    }
  });

  return copy;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const q = normalizeQuery(searchParams.get("q"));
    const agreementNameQuery = normalizeValue(searchParams.get("agreementName"));
    const selectedChapters = parseMultiParam(searchParams, "chapters");
    const selectedLocalUnions = parseMultiParam(searchParams, "localUnions");
    const selectedAgreementTypes = parseMultiParam(searchParams, "agreementTypes");
    const selectedStates = parseMultiParam(searchParams, "states");
    const includeNationalDatabase = parseBoolean(
      searchParams.get("includeNationalDatabase"),
      true
    );
    const showExpired = parseBoolean(searchParams.get("showExpired"), false);
    const sort = parseSort(searchParams.get("sort"));

    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const pageSize = parsePositiveInt(
      searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    );

    if (!q) {
      return NextResponse.json({
        query: "",
        count: 0,
        page: 1,
        pageSize,
        totalPages: 1,
        sort,
        results: [],
      });
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
      take: 500,
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
      if (!includeNationalDatabase && doc.kbId === SHARED_CBAS_KB_ID) {
        return false;
      }

      if (isUserSystemAdmin) return true;
      if (!canManageAgreements) return true;
      if (doc.kbId === SHARED_CBAS_KB_ID) return true;

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
      const aIsNational = a.collectionId === SHARED_CBAS_KB_ID;
      const bIsNational = b.collectionId === SHARED_CBAS_KB_ID;

      if (aIsNational !== bIsNational) {
        return aIsNational ? 1 : -1;
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

    const dedupedResults = Array.from(dedupedMap.values());

    const todayStr = new Date().toISOString().slice(0, 10);

    const filteredResults = dedupedResults.filter((row) => {
      const matchesName =
        !agreementNameQuery ||
        row.agreementName.toLowerCase().includes(agreementNameQuery.toLowerCase());

      const matchesChapterFilter = matchesSingle(
        normalizeValue(row.chapter) || "—",
        selectedChapters
      );

      const matchesLocalUnionFilter = matchesMultiValue(
        normalizeValue(row.localUnion),
        selectedLocalUnions
      );

      const matchesAgreementTypeFilter = matchesSingle(
        normalizeValue(row.agreementType) || "—",
        selectedAgreementTypes
      );

      const matchesStateFilter = matchesMultiValue(
        normalizeValue(row.states),
        selectedStates
      );

      const matchesStatus = (() => {
        if (showExpired) return true;

        if (!row.effectiveFrom && !row.effectiveTo) return false;

        const fromStr = row.effectiveFrom?.slice(0, 10) ?? null;
        const toStr = row.effectiveTo?.slice(0, 10) ?? null;

        const afterStart = !fromStr || fromStr <= todayStr;
        const beforeEnd = !toStr || toStr >= todayStr;

        return afterStart && beforeEnd;
      })();

      return (
        matchesName &&
        matchesChapterFilter &&
        matchesLocalUnionFilter &&
        matchesAgreementTypeFilter &&
        matchesStateFilter &&
        matchesStatus
      );
    });

    const sortedResults = sortRows(filteredResults, sort);

    const count = sortedResults.length;
    const totalPages = Math.max(1, Math.ceil(count / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const results = sortedResults.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      query: q,
      count,
      page: safePage,
      pageSize,
      totalPages,
      sort,
      results,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}