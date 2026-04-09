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

const SHARED_CBAS_KB_ID = "cbas_shared";

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
    const nationalDatabaseFilter =
      searchParams.get("nationalDatabaseFilter") === "shared" ? "shared" : "all";
    const showExpired = searchParams.get("showExpired") === "true";

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

    const visibleRows: AgreementRowResponse[] = documents
      .map((doc) => {
        const chapter = normalizeValue(doc.chapter) || "—";
        const localUnion = normalizeValue(doc.localUnion) || "—";
        const agreementType = normalizeValue(doc.cbaType) || "—";
        const states = normalizeValue(doc.state) || "—";
        const filename = doc.filename ?? "(unknown)";
        const filenameKey = normalizeKey(filename);

        const preferredAgreementName =
          preferredAgreementNameByFilename.get(filenameKey) ?? null;

        const agreementName =
          preferredAgreementName ||
          normalizeValue(doc.kb?.name) ||
          "(untitled agreement)";

        const fileUrl = doc.id
          ? `/api/agreements/${encodeURIComponent(doc.id)}/file`
          : null;

        return {
          id: doc.id,
          agreementName,
          chapter,
          localUnion,
          agreementType,
          states,
          filename,
          uploadedAt: Math.floor(doc.createdAt.getTime() / 1000),
          status: "stored",
          collectionId: doc.kb?.id ?? "",
          collectionName: doc.kb?.name ?? "",
          fileId: doc.openaiFileId ?? "",
          fileUrl,
          sharedToCbas: Boolean(doc.sharedToCbas),
          effectiveFrom: doc.effectiveFrom ? doc.effectiveFrom.toISOString() : null,
          effectiveTo: doc.effectiveTo ? doc.effectiveTo.toISOString() : null,
        };
      })
      .filter((row) => {
        if (isUserSystemAdmin) return true;
        if (!canManageAgreements) return true;
        if (row.sharedToCbas) return true;
        return normalizedManagedChapterNames.has(normalizeKey(row.chapter));
      });

    const rowsForDedup = [...visibleRows].sort((a, b) => {
      if (a.sharedToCbas !== b.sharedToCbas) {
        return a.sharedToCbas ? 1 : -1;
      }
      return b.uploadedAt - a.uploadedAt;
    });

    const dedupedMap = new Map<string, AgreementRowResponse>();

    for (const row of rowsForDedup) {
      const key = buildAgreementDedupKey(row);
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, row);
      }
    }

    const dedupedRows = Array.from(dedupedMap.values()).sort(
      (a, b) => b.uploadedAt - a.uploadedAt
    );

    const chapterOptions = toOptionArray(
      dedupedRows
        .map((row) => normalizeValue(row.chapter))
        .filter((value) => value && value !== "—")
    );

    const localUnionOptions = toOptionArray(
      dedupedRows.flatMap((row) =>
        splitCommaSeparated(row.localUnion === "—" ? "" : row.localUnion)
      )
    );

    const agreementTypeOptions = toOptionArray(
      dedupedRows
        .map((row) => normalizeValue(row.agreementType))
        .filter((value) => value && value !== "—")
    );

    const stateOptions = toOptionArray(
      dedupedRows.flatMap((row) =>
        splitCommaSeparated(row.states === "—" ? "" : row.states)
      )
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    const filteredRows = dedupedRows.filter((row) => {
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
      const matchesNationalFilter =
        nationalDatabaseFilter === "all" ||
        (nationalDatabaseFilter === "shared" && row.sharedToCbas);

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
        matchesNationalFilter &&
        matchesStatus
      );
    });

    return NextResponse.json({
      rows: filteredRows,
      totalRows: dedupedRows.length,
      filteredRowsCount: filteredRows.length,
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