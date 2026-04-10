import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isSystemAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type AgreementRowResponse = {
  id: string;
  agreementName: string;
  chapter: string;
  localUnion: string;
  agreementType: string;
  states: string;
  filename: string;
  uploadedAt: number;
  status: string;
  collectionId: string;
  collectionName: string;
  fileId: string;
  fileUrl: string | null;
  sharedToCbas: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

type FilterOption = {
  value: string;
  label: string;
};

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

function toOptionArray(values: Iterable<string>): FilterOption[] {
  return [...new Set(values)]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      value,
      label: value,
    }));
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

function parseMultiParam(searchParams: URLSearchParams, key: string): string[] {
  return searchParams
    .getAll(key)
    .map((value) => value.trim())
    .filter(Boolean);
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

function sortRows(rows: AgreementRowResponse[], sort: AgreementSort): AgreementRowResponse[] {
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

type VisibleRepresentativeDocument = {
  id: string;
  filename: string;
  createdAt: Date;
  chapter: string | null;
  localUnion: string | null;
  cbaType: string | null;
  state: string | null;
  sharedToCbas: boolean;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  openaiFileId: string;
  kbId: string;
  kb: {
    id: string;
    name: string;
  } | null;
};

type CanonicalAgreementListItem = {
  id: string;
  name: string;
  sourceFilename: string | null;
  chapter: string | null;
  localUnion: string | null;
  cbaType: string | null;
  state: string | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  representative: VisibleRepresentativeDocument | null;
};

function chooseRepresentativeDocument(
  docs: VisibleRepresentativeDocument[]
): VisibleRepresentativeDocument | null {
  if (docs.length === 0) return null;

  const sorted = [...docs].sort((a, b) => {
    const aIsNational = a.kbId === SHARED_CBAS_KB_ID;
    const bIsNational = b.kbId === SHARED_CBAS_KB_ID;

    if (aIsNational !== bIsNational) {
      return aIsNational ? 1 : -1;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return sorted[0] ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

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

    const agreements = await prisma.agreement.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        sourceFilename: true,
        chapter: true,
        localUnion: true,
        cbaType: true,
        state: true,
        effectiveFrom: true,
        effectiveTo: true,
        documents: {
          where: {
            deletedAt: null,
            isCba: true,
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
            openaiFileId: true,
            kbId: true,
            kb: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const visibleAgreements: CanonicalAgreementListItem[] = agreements
      .map((agreement) => {
        const visibleDocs = agreement.documents.filter((doc) => {
          if (!includeNationalDatabase && doc.kbId === SHARED_CBAS_KB_ID) {
            return false;
          }

          if (isUserSystemAdmin) return true;
          if (!canManageAgreements) return true;
          if (doc.kbId === SHARED_CBAS_KB_ID) return true;

          return normalizedManagedChapterNames.has(normalizeKey(doc.chapter));
        });

        const representative = chooseRepresentativeDocument(visibleDocs);

        return {
          id: agreement.id,
          name: agreement.name,
          sourceFilename: agreement.sourceFilename,
          chapter: agreement.chapter,
          localUnion: agreement.localUnion,
          cbaType: agreement.cbaType,
          state: agreement.state,
          effectiveFrom: agreement.effectiveFrom,
          effectiveTo: agreement.effectiveTo,
          representative,
        };
      })
      .filter((agreement) => agreement.representative !== null);

    const rows: AgreementRowResponse[] = visibleAgreements.map((agreement) => {
      const representative = agreement.representative!;
      const chapter = normalizeValue(agreement.chapter) || normalizeValue(representative.chapter) || "—";
      const localUnion =
        normalizeValue(agreement.localUnion) || normalizeValue(representative.localUnion) || "—";
      const agreementType =
        normalizeValue(agreement.cbaType) || normalizeValue(representative.cbaType) || "—";
      const states =
        normalizeValue(agreement.state) || normalizeValue(representative.state) || "—";
      const filename =
        normalizeValue(representative.filename) ||
        normalizeValue(agreement.sourceFilename) ||
        "(unknown)";
      const agreementName =
        normalizeValue(agreement.name) || "(untitled agreement)";
      const fileUrl = representative.id
        ? `/api/agreements/${encodeURIComponent(representative.id)}/file`
        : null;

      return {
        id: agreement.id,
        agreementName,
        chapter,
        localUnion,
        agreementType,
        states,
        filename,
        uploadedAt: Math.floor(representative.createdAt.getTime() / 1000),
        status: "stored",
        collectionId: representative.kb?.id ?? "",
        collectionName: representative.kb?.name ?? "",
        fileId: representative.openaiFileId ?? "",
        fileUrl,
        sharedToCbas: Boolean(representative.sharedToCbas),
        effectiveFrom: (agreement.effectiveFrom ?? representative.effectiveFrom)
          ? (agreement.effectiveFrom ?? representative.effectiveFrom)!.toISOString()
          : null,
        effectiveTo: (agreement.effectiveTo ?? representative.effectiveTo)
          ? (agreement.effectiveTo ?? representative.effectiveTo)!.toISOString()
          : null,
      };
    });

    const chapterOptions = toOptionArray(
      rows
        .map((row) => normalizeValue(row.chapter))
        .filter((value) => value && value !== "—")
    );

    const localUnionOptions = toOptionArray(
      rows.flatMap((row) =>
        splitCommaSeparated(row.localUnion === "—" ? "" : row.localUnion)
      )
    );

    const agreementTypeOptions = toOptionArray(
      rows
        .map((row) => normalizeValue(row.agreementType))
        .filter((value) => value && value !== "—")
    );

    const stateOptions = toOptionArray(
      rows.flatMap((row) =>
        splitCommaSeparated(row.states === "—" ? "" : row.states)
      )
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    const filteredRows = rows.filter((row) => {
      const matchesName =
        !agreementNameQuery ||
        row.agreementName.toLowerCase().includes(agreementNameQuery.toLowerCase());

      const matchesChapterFilter = matchesSingle(row.chapter, selectedChapters);
      const matchesLocalUnionFilter = matchesMultiValue(
        row.localUnion === "—" ? "" : row.localUnion,
        selectedLocalUnions
      );
      const matchesAgreementTypeFilter = matchesSingle(
        row.agreementType,
        selectedAgreementTypes
      );
      const matchesStateFilter = matchesMultiValue(
        row.states === "—" ? "" : row.states,
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

    const sortedRows = sortRows(filteredRows, sort);

    const filteredRowsCount = filteredRows.length;
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(filteredRowsCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pagedRows = sortedRows.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      rows: pagedRows,
      totalRows,
      filteredRowsCount,
      page: safePage,
      pageSize,
      totalPages,
      sort,
      filterOptions: {
        chapterOptions,
        localUnionOptions,
        agreementTypeOptions,
        stateOptions,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}