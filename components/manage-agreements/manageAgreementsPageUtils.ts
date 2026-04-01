import { AgreementRow } from "./types";
import { ChapterOption } from "./SearchableChapterSelect";

export type FilterOption = {
  value: string;
  label: string;
};

export type SessionMembership = {
  chapterId: string;
  chapterName: string;
  role: "CHAPTER_ADMIN" | "USER";
};

export type ViewerPermissions = {
  isSystemAdmin: boolean;
  isChapterAdmin: boolean;
  canManageAgreements: boolean;
  managedChapterNames: string[];
  managedChapterIds: string[];
};

export type SearchResultRow = {
  id: string;
  agreementName: string;
  collectionId: string;
  filename: string;
  uploadedAt: number;
  chapter: string;
  localUnion: string;
  agreementType: string;
  states: string;
  sharedToCbas: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export type AgreementPreviewResponse = {
  id: string;
  agreementName: string;
  collectionId: string;
  filename: string;
  uploadedAt: number;
  chapter: string;
  localUnion: string;
  agreementType: string;
  states: string;
  sharedToCbas: boolean;
  storageProvider: string | null;
  storageKey: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  sha256: string | null;
  extractionState: string;
  extractedAt: number | null;
  hasStoredOriginal: boolean;
  fileUrl: string | null;
  canPreviewInline: boolean;
};

export type ExtractedMetadata = {
  agreementName: string | null;
  chapter: string | null;
  localUnion: string | null;
  agreementType: string | null;
  states: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export type PublicChaptersResponse = {
  chapters?: ChapterOption[];
  error?: string;
};

export const SHARED_CBAS_KB_ID = "cbas_shared";

export function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function normalizeChapterKey(value: string | null | undefined) {
  return normalizeValue(value).toLowerCase();
}

export function isManagedChapter(
  chapterName: string,
  managedChapterNames: string[]
): boolean {
  const key = normalizeChapterKey(chapterName);
  if (!key) return false;

  return managedChapterNames.some(
    (managedChapterName) => normalizeChapterKey(managedChapterName) === key
  );
}

export function isVisibleToChapterAdmin(
  row: AgreementRow,
  managedChapterNames: string[]
): boolean {
  if (row.sharedToCbas) return true;
  return isManagedChapter(row.chapter, managedChapterNames);
}

export function splitCommaSeparated(value: string | null | undefined): string[] {
  return normalizeValue(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function toOptionArray(values: string[]): FilterOption[] {
  return [...new Set(values)]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

export function matchesSingle(value: string, selected: string[]) {
  if (selected.length === 0) return true;
  return selected.includes(value);
}

export function matchesMultiValue(value: string, selected: string[]) {
  if (selected.length === 0) return true;
  const parts = splitCommaSeparated(value);
  return parts.some((part) => selected.includes(part));
}

export function getEditProgressPercent(status: string | null): number {
  if (!status) return 0;
  const value = status.toLowerCase();

  if (value.includes("saving changes")) return 25;
  if (value.includes("syncing shared copies")) return 60;
  if (value.includes("refreshing agreements")) return 85;
  if (value.includes("done") || value.includes("saved")) return 100;
  if (value.includes("saving")) return 35;

  return 0;
}

export function buildAgreementDedupKey(row: AgreementRow): string {
  return [
    normalizeValue(row.filename).toLowerCase(),
    normalizeValue(row.chapter).toLowerCase(),
    normalizeValue(row.localUnion).toLowerCase(),
    normalizeValue(row.agreementType).toLowerCase(),
    normalizeValue(row.states).toLowerCase(),
    normalizeValue(row.effectiveFrom).toLowerCase(),
    normalizeValue(row.effectiveTo).toLowerCase(),
  ].join("||");
}