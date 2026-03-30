"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import AgreementDatabaseCard from "./AgreementDatabaseCard";
import ManageAgreementsHero from "./ManageAgreementsHero";
import UploadAgreementModal from "./UploadAgreementModal";
import { manageAgreementsStyles as styles } from "./styles";
import { AgreementRow, KBFilesResponse, KBIndexResponse } from "./types";

const AgreementPdfViewer = dynamic(() => import("./AgreementPdfViewer"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 18, color: "var(--muted-strong)", fontWeight: 700 }}>
      Loading PDF viewer…
    </div>
  ),
});

type FilterOption = {
  value: string;
  label: string;
};

type SearchResultRow = {
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

type AgreementPreviewResponse = {
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

type ExtractedMetadata = {
  agreementName: string | null;
  chapter: string | null;
  localUnion: string | null;
  agreementType: string | null;
  states: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim();
}

function splitCommaSeparated(value: string | null | undefined): string[] {
  return normalizeValue(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toOptionArray(values: string[]): FilterOption[] {
  return [...new Set(values)]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

function matchesSingle(value: string, selected: string[]) {
  if (selected.length === 0) return true;
  return selected.includes(value);
}

function matchesMultiValue(value: string, selected: string[]) {
  if (selected.length === 0) return true;
  const parts = splitCommaSeparated(value);
  return parts.some((part) => selected.includes(part));
}

function getEditProgressPercent(status: string | null): number {
  if (!status) return 0;
  const value = status.toLowerCase();
  if (value.includes("saving changes")) return 25;
  if (value.includes("syncing shared copies")) return 60;
  if (value.includes("refreshing agreements")) return 85;
  if (value.includes("done") || value.includes("saved")) return 100;
  if (value.includes("saving")) return 35;
  return 0;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  fontSize: 13,
  color: "var(--muted-strong)",
};

const requiredMark = (
  <span style={{ color: "#c0392b", marginLeft: 2 }}>*</span>
);

export default function ManageAgreementsPageClient() {
  const [kbIndex, setKbIndex] = useState<KBIndexResponse | null>(null);
  const [loadingCollections, setLoadingCollections] = useState(false);

  const [filesLoading, setFilesLoading] = useState(false);
  const [allAgreementRows, setAllAgreementRows] = useState<AgreementRow[]>([]);

  const [error, setError] = useState<string | null>(null);

  const [agreementNameQuery, setAgreementNameQuery] = useState("");
  const [contentSearchQuery, setContentSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchRows, setSearchRows] = useState<AgreementRow[] | null>(null);

  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedLocalUnions, setSelectedLocalUnions] = useState<string[]>([]);
  const [selectedAgreementTypes, setSelectedAgreementTypes] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [nationalDatabaseFilter, setNationalDatabaseFilter] = useState<"all" | "shared">("all");
  const [showExpired, setShowExpired] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const [agreementName, setAgreementName] = useState("");
  const [agreementFiles, setAgreementFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [chapter, setChapter] = useState("");
  const [localUnion, setLocalUnion] = useState("");
  const [agreementType, setAgreementType] = useState("");
  const [states, setStates] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [shareToNationalDatabase, setShareToNationalDatabase] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAgreementId, setEditingAgreementId] = useState("");
  const [editAgreementName, setEditAgreementName] = useState("");
  const [editChapter, setEditChapter] = useState("");
  const [editLocalUnion, setEditLocalUnion] = useState("");
  const [editAgreementType, setEditAgreementType] = useState("");
  const [editStates, setEditStates] = useState("");
  const [editEffectiveFrom, setEditEffectiveFrom] = useState("");
  const [editEffectiveTo, setEditEffectiveTo] = useState("");
  const [editShareToNationalDatabase, setEditShareToNationalDatabase] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<AgreementPreviewResponse | null>(null);
  const [previewInitialSearchQuery, setPreviewInitialSearchQuery] = useState("");

  const [isDeletingAgreementId, setIsDeletingAgreementId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadCollections() {
    const res = await fetch("/api/kb/list");
    const data = (await res.json()) as KBIndexResponse;
    setKbIndex(data);
    return data;
  }

  async function loadAllAgreements(indexOverride?: KBIndexResponse) {
    setFilesLoading(true);
    setError(null);

    try {
      const index = indexOverride ?? (await loadCollections());
      const collections = index?.userKbs ?? [];

      const fileResults = await Promise.all(
        collections.map(async (collection) => {
          const res = await fetch(
            `/api/kb/files?kbId=${encodeURIComponent(collection.id)}`
          );
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data?.error ?? `Failed to load ${collection.name}`);
          }

          return data as KBFilesResponse;
        })
      );

      const rows: AgreementRow[] = fileResults.flatMap((filesData) => {
        const sortedFiles = [...filesData.files].sort(
          (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
        );

        return sortedFiles.map((file) => ({
          id: file.id,
          agreementName: filesData.kbName || "(untitled agreement)",
          chapter: file.chapter?.trim() || "—",
          localUnion: file.localUnion?.trim() || "—",
          agreementType: file.agreementType?.trim() || "—",
          states: file.states?.trim() || "—",
          filename: file.filename ?? "(unknown)",
          uploadedAt: file.created_at ?? 0,
          status: file.status ?? "",
          collectionId: filesData.kbId,
          collectionName: filesData.kbName,
          fileId: file.file_id,
          fileUrl: file.fileUrl ?? null,
          sharedToCbas: Boolean(file.sharedToCbas),
          effectiveFrom: file.effectiveFrom ?? null,
          effectiveTo: file.effectiveTo ?? null,
        }));
      });

      rows.sort((a, b) => b.uploadedAt - a.uploadedAt);
      setAllAgreementRows(rows);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load agreements.");
      setAllAgreementRows([]);
    } finally {
      setFilesLoading(false);
    }
  }

  function buildCollectionName() {
    const trimmedAgreementName = agreementName.trim();
    const trimmedChapter = chapter.trim();
    const trimmedLocalUnion = localUnion.trim();
    const trimmedAgreementType = agreementType.trim();

    if (trimmedAgreementName) return trimmedAgreementName;

    const parts = [trimmedChapter, trimmedLocalUnion, trimmedAgreementType].filter(Boolean);
    if (parts.length > 0) return parts.join(" - ");

    return "Agreement Upload";
  }

  function resetUploadForm() {
    setAgreementName("");
    setAgreementFiles([]);
    setChapter("");
    setLocalUnion("");
    setAgreementType("");
    setStates("");
    setEffectiveFrom("");
    setEffectiveTo("");
    setShareToNationalDatabase(false);
    setUploadError(null);
    setUploadStatus(null);
    setDragActive(false);
    setIsExtracting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function clearFilters() {
    setAgreementNameQuery("");
    setContentSearchQuery("");
    setSearchRows(null);
    setSearchError(null);
    setSelectedChapters([]);
    setSelectedLocalUnions([]);
    setSelectedAgreementTypes([]);
    setSelectedStates([]);
    setNationalDatabaseFilter("all");
  }

  function openUploadModal() {
    resetUploadForm();
    setIsUploadModalOpen(true);
  }

  function closeUploadModal() {
    if (isUploading || isExtracting) return;
    setIsUploadModalOpen(false);
  }

  async function extractMetadata(file: File) {
    setIsExtracting(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/agreements/extract-metadata", {
        method: "POST",
        body: form,
      });

      if (!res.ok) return;

      const data = (await res.json()) as ExtractedMetadata;

      //if (data.agreementName) setAgreementName(data.agreementName);
      //if (data.chapter) setChapter(data.chapter);
      if (data.localUnion) setLocalUnion(data.localUnion);
      //if (data.agreementType) setAgreementType(data.agreementType);
      if (data.states) setStates(data.states);
      if (data.effectiveFrom) setEffectiveFrom(data.effectiveFrom);
      if (data.effectiveTo) setEffectiveTo(data.effectiveTo);
    } catch {
      // silent fail — user fills in manually
    } finally {
      setIsExtracting(false);
    }
  }

  function handleDroppedFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setAgreementFiles([file]);
    extractMetadata(file);
  }

  async function uploadAgreement() {
    setUploadError(null);
    setUploadStatus(null);

    if (agreementFiles.length === 0) {
      setUploadError("Please select an agreement file.");
      return;
    }

    if (!agreementName.trim()) {
      setUploadError("Please enter an Agreement Name.");
      return;
    }

    if (!chapter.trim()) {
      setUploadError("Please enter a Chapter.");
      return;
    }

    if (!localUnion.trim()) {
      setUploadError("Please enter a Local Union.");
      return;
    }

    if (!agreementType.trim()) {
      setUploadError("Please enter an Agreement Type.");
      return;
    }

    if (!states.trim()) {
      setUploadError("Please enter State(s), for example LA or LA, MS.");
      return;
    }

    if (!effectiveFrom.trim()) {
      setUploadError("Please enter an Effective From date.");
      return;
    }

    if (!effectiveTo.trim()) {
      setUploadError("Please enter an Effective To date.");
      return;
    }

    if (effectiveTo < effectiveFrom) {
      setUploadError("Effective To date must be on or after the Effective From date.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus("Preparing upload...");

      const form = new FormData();
      form.append("name", buildCollectionName());
      form.append("files", agreementFiles[0]);
      form.append("isCba", "true");
      form.append("shareToCbas", shareToNationalDatabase ? "true" : "false");
      form.append("chapter", chapter.trim());
      form.append("localUnion", localUnion.trim());
      form.append("cbaType", agreementType.trim());
      form.append("state", states.trim());
      form.append("effectiveFrom", effectiveFrom.trim());
      form.append("effectiveTo", effectiveTo.trim());

      setUploadStatus("Uploading to OpenAI and processing agreement...");

      const res = await fetch("/api/kb/create", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Upload failed");
      }

      setUploadStatus("Refreshing agreements...");
      const refreshed = await loadCollections();
      await loadAllAgreements(refreshed);

      setUploadStatus("Done.");
      setIsUploadModalOpen(false);
      resetUploadForm();
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function openEditModal(row: AgreementRow) {
    setEditingAgreementId(row.id);
    setEditAgreementName(row.agreementName);
    setEditChapter(row.chapter === "—" ? "" : row.chapter);
    setEditLocalUnion(row.localUnion === "—" ? "" : row.localUnion);
    setEditAgreementType(row.agreementType === "—" ? "" : row.agreementType);
    setEditStates(row.states === "—" ? "" : row.states);
    setEditEffectiveFrom(row.effectiveFrom ? row.effectiveFrom.slice(0, 10) : "");
    setEditEffectiveTo(row.effectiveTo ? row.effectiveTo.slice(0, 10) : "");
    setEditShareToNationalDatabase(Boolean(row.sharedToCbas));
    setEditError(null);
    setEditStatus(null);
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    if (isSavingEdit) return;
    setIsEditModalOpen(false);
  }

  async function saveEdit() {
    setEditError(null);
    setEditStatus(null);

    if (!editingAgreementId) {
      setEditError("Missing agreement id.");
      return;
    }

    if (!editAgreementName.trim()) {
      setEditError("Please enter an Agreement Name.");
      return;
    }

    if (!editChapter.trim()) {
      setEditError("Please enter a Chapter.");
      return;
    }

    if (!editLocalUnion.trim()) {
      setEditError("Please enter a Local Union.");
      return;
    }

    if (!editAgreementType.trim()) {
      setEditError("Please enter an Agreement Type.");
      return;
    }

    if (!editStates.trim()) {
      setEditError("Please enter State(s), for example LA or LA, MS.");
      return;
    }

    if (!editEffectiveFrom.trim()) {
      setEditError("Please enter an Effective From date.");
      return;
    }

    if (!editEffectiveTo.trim()) {
      setEditError("Please enter an Effective To date.");
      return;
    }

    if (editEffectiveTo < editEffectiveFrom) {
      setEditError("Effective To date must be on or after the Effective From date.");
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditStatus("Saving changes...");

      const res = await fetch(
        `/api/agreements/${encodeURIComponent(editingAgreementId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agreementName: editAgreementName,
            chapter: editChapter,
            localUnion: editLocalUnion,
            agreementType: editAgreementType,
            states: editStates,
            sharedToCbas: editShareToNationalDatabase,
            effectiveFrom: editEffectiveFrom || null,
            effectiveTo: editEffectiveTo || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to save changes.");
      }

      setEditStatus("Syncing shared copies...");
      await loadAllAgreements();

      if (contentSearchQuery.trim()) {
        setEditStatus("Refreshing agreements...");
        await runContentSearch(contentSearchQuery);
      }

      setEditStatus("Done.");
      setIsEditModalOpen(false);
    } catch (e: any) {
      setEditError(e?.message ?? "Failed to save changes.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  function closePreviewPanel() {
    setIsPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewData(null);
    setPreviewInitialSearchQuery("");
  }

  async function openUploadedFile(row: AgreementRow) {
    setError(null);
    setPreviewError(null);
    setPreviewLoading(true);
    setPreviewData(null);
    setPreviewInitialSearchQuery(contentSearchQuery.trim());
    setIsPreviewOpen(true);

    try {
      const res = await fetch(`/api/agreements/${encodeURIComponent(row.id)}`);
      const data = (await res.json()) as AgreementPreviewResponse | { error?: string };

      if (!res.ok) {
        throw new Error(
          ("error" in data && data.error) || "Failed to load agreement preview."
        );
      }

      setPreviewData(data as AgreementPreviewResponse);
    } catch (e: any) {
      setPreviewError(e?.message ?? "Failed to load agreement preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function deleteAgreement(row: AgreementRow) {
    const confirmed = window.confirm(
      `Delete "${row.agreementName}"?\n\nThis will permanently remove the agreement and its file from the database. This cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeletingAgreementId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/agreements/${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Delete failed.");
      }
      if (previewData?.id === row.id) {
        closePreviewPanel();
      }
      await loadAllAgreements().catch(() =>
        setError("Failed to refresh agreements.")
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete agreement.");
    } finally {
      setIsDeletingAgreementId(null);
    }
  }

  async function runContentSearch(query: string) {
    const trimmed = query.trim();

    if (!trimmed) {
      setSearchRows(null);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `/api/agreements/search?q=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Search failed.");
      }

      const rows: AgreementRow[] = ((data?.results ?? []) as SearchResultRow[]).map(
        (row) => ({
          id: row.id,
          agreementName: row.agreementName || "(untitled agreement)",
          chapter: row.chapter?.trim() || "—",
          localUnion: row.localUnion?.trim() || "—",
          agreementType: row.agreementType?.trim() || "—",
          states: row.states?.trim() || "—",
          filename: row.filename ?? "(unknown)",
          uploadedAt: row.uploadedAt ?? 0,
          status: "stored",
          collectionId: row.collectionId ?? "",
          collectionName: row.agreementName || "",
          fileId: "",
          fileUrl: null,
          sharedToCbas: Boolean(row.sharedToCbas),
          effectiveFrom: row.effectiveFrom ?? null,
          effectiveTo: row.effectiveTo ?? null,
        })
      );

      setSearchRows(rows);
    } catch (e: any) {
      setSearchError(e?.message ?? "Search failed.");
      setSearchRows([]);
    } finally {
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoadingCollections(true);
        const data = await loadCollections();
        await loadAllAgreements(data);
      } catch {
        setError("Failed to load agreement collections.");
      } finally {
        setLoadingCollections(false);
      }
    })();
  }, []);

  useEffect(() => {
    const trimmed = contentSearchQuery.trim();

    if (!trimmed) {
      setSearchRows(null);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      runContentSearch(trimmed);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [contentSearchQuery]);

  const chapterOptions = useMemo(
    () =>
      toOptionArray(
        allAgreementRows
          .map((row) => normalizeValue(row.chapter))
          .filter((value) => value && value !== "—")
      ),
    [allAgreementRows]
  );

  const localUnionOptions = useMemo(
    () =>
      toOptionArray(
        allAgreementRows.flatMap((row) =>
          splitCommaSeparated(row.localUnion === "—" ? "" : row.localUnion)
        )
      ),
    [allAgreementRows]
  );

  const agreementTypeOptions = useMemo(
    () =>
      toOptionArray(
        allAgreementRows
          .map((row) => normalizeValue(row.agreementType))
          .filter((value) => value && value !== "—")
      ),
    [allAgreementRows]
  );

  const stateOptions = useMemo(
    () =>
      toOptionArray(
        allAgreementRows.flatMap((row) =>
          splitCommaSeparated(row.states === "—" ? "" : row.states)
        )
      ),
    [allAgreementRows]
  );

  const baseRows = searchRows ?? allAgreementRows;

  const filteredAgreementRows = useMemo(() => {
    const nameNeedle = agreementNameQuery.trim().toLowerCase();

    return baseRows.filter((row) => {
      const matchesName =
        !nameNeedle || row.agreementName.toLowerCase().includes(nameNeedle);
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

      return (
        matchesName &&
        matchesChapterFilter &&
        matchesLocalUnionFilter &&
        matchesAgreementTypeFilter &&
        matchesStateFilter &&
        matchesNationalFilter
      );
    });
  }, [
    baseRows,
    agreementNameQuery,
    selectedChapters,
    selectedLocalUnions,
    selectedAgreementTypes,
    selectedStates,
    nationalDatabaseFilter,
  ]);

  const statusFilteredRows = useMemo(() => {
    if (showExpired) return filteredAgreementRows;

    const todayStr = new Date().toISOString().slice(0, 10);

    return filteredAgreementRows.filter((row) => {
      if (!row.effectiveFrom && !row.effectiveTo) return false;

      const fromStr = row.effectiveFrom?.slice(0, 10) ?? null;
      const toStr = row.effectiveTo?.slice(0, 10) ?? null;

      const afterStart = !fromStr || fromStr <= todayStr;
      const beforeEnd = !toStr || toStr >= todayStr;

      return afterStart && beforeEnd;
    });
  }, [filteredAgreementRows, showExpired]);

  const showPreviewPane = isPreviewOpen;

  return (
    <div style={styles.page}>
      <ManageAgreementsHero onOpenUploadModal={openUploadModal} />

      {uploadStatus && <div style={styles.successBox}>{uploadStatus}</div>}

      {uploadError && !isUploadModalOpen && (
        <div style={styles.errorBox}>
          <b>Upload error:</b> {uploadError}
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <b>Error:</b> {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: showPreviewPane
            ? "minmax(0, 1fr) minmax(0, 2fr)"
            : "minmax(0, 1fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <AgreementDatabaseCard
            filesLoading={filesLoading || loadingCollections}
            searchLoading={searchLoading}
            searchError={searchError}
            agreementRows={allAgreementRows}
            filteredAgreementRows={statusFilteredRows}
            agreementNameQuery={agreementNameQuery}
            contentSearchQuery={contentSearchQuery}
            chapterOptions={chapterOptions}
            localUnionOptions={localUnionOptions}
            agreementTypeOptions={agreementTypeOptions}
            stateOptions={stateOptions}
            selectedChapters={selectedChapters}
            selectedLocalUnions={selectedLocalUnions}
            selectedAgreementTypes={selectedAgreementTypes}
            selectedStates={selectedStates}
            nationalDatabaseFilter={nationalDatabaseFilter}
            showExpired={showExpired}
            hideContentSearch={isPreviewOpen}
            onAgreementNameQueryChange={setAgreementNameQuery}
            onContentSearchQueryChange={setContentSearchQuery}
            onSelectedChaptersChange={setSelectedChapters}
            onSelectedLocalUnionsChange={setSelectedLocalUnions}
            onSelectedAgreementTypesChange={setSelectedAgreementTypes}
            onSelectedStatesChange={setSelectedStates}
            onNationalDatabaseFilterChange={setNationalDatabaseFilter}
            onShowExpiredChange={setShowExpired}
            onClearFilters={clearFilters}
            onRefreshAgreements={() =>
              loadAllAgreements().catch(() =>
                setError("Failed to refresh agreements.")
              )
            }
            onOpenUploadedFile={openUploadedFile}
            onOpenEditModal={openEditModal}
            onDeleteAgreement={deleteAgreement}
            isDeletingAgreementId={isDeletingAgreementId}
          />
        </div>

        {showPreviewPane && (
          <div
            style={{
              minWidth: 0,
              position: "sticky",
              top: 16,
              alignSelf: "start",
            }}
          >
            <div
              style={{
                borderRadius: 20,
                border: "1px solid var(--border)",
                background: "var(--panel)",
                boxShadow: "var(--shadow-soft)",
                overflow: "hidden",
                display: "grid",
                gridTemplateRows: "auto minmax(78vh, calc(100vh - 180px))",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--border)",
                  background:
                    "linear-gradient(180deg, rgba(148,163,184,0.06), rgba(148,163,184,0.02))",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "var(--foreground)",
                      lineHeight: 1.2,
                    }}
                    title={previewData?.agreementName || ""}
                  >
                    {previewData?.agreementName || "Loading agreement..."}
                  </div>

                  {previewData?.filename && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 220,
                      }}
                      title={previewData.filename}
                    >
                      {previewData.filename}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                    flexWrap: "wrap",
                  }}
                >
                  {previewData?.fileUrl && (
                    <>
                      <a
                        href={previewData.fileUrl}
                        download={previewData.filename || undefined}
                        style={styles.primaryBtn}
                      >
                        Download
                      </a>
                      <a
                        href={previewData.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.subtleBtn}
                      >
                        Open in New Tab
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={closePreviewPanel}
                    style={styles.subtleBtn}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ minHeight: 0, background: "#fff", display: "grid" }}>
                {previewLoading && (
                  <div
                    style={{
                      padding: 18,
                      color: "var(--muted-strong)",
                      fontWeight: 700,
                    }}
                  >
                    Loading agreement preview…
                  </div>
                )}

                {previewError && (
                  <div style={{ padding: 18 }}>
                    <div style={styles.errorBox}>
                      <b>Preview error:</b> {previewError}
                    </div>
                  </div>
                )}

                {!previewLoading && !previewError && previewData?.fileUrl ? (
                  previewData.canPreviewInline ? (
                    previewData.mimeType === "application/pdf" ? (
                      <AgreementPdfViewer
                        fileUrl={previewData.fileUrl}
                        searchQuery={previewInitialSearchQuery}
                      />
                    ) : (
                      <iframe
                        title={previewData.filename || "Agreement preview"}
                        src={previewData.fileUrl}
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                          background: "#fff",
                        }}
                      />
                    )
                  ) : (
                    <div
                      style={{
                        padding: 24,
                        display: "grid",
                        gap: 12,
                        alignContent: "start",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 18,
                          color: "var(--foreground)",
                        }}
                      >
                        Inline preview is not available for this file type.
                      </div>
                      <div style={{ color: "var(--muted)" }}>
                        Use the buttons above to download the agreement or open
                        it in a new tab.
                      </div>
                    </div>
                  )
                ) : !previewLoading && !previewError ? (
                  <div style={{ padding: 24, color: "var(--muted)" }}>
                    No preview is available for this agreement.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      <UploadAgreementModal
        isOpen={isUploadModalOpen}
        isUploading={isUploading}
        isExtracting={isExtracting}
        agreementName={agreementName}
        agreementFiles={agreementFiles}
        chapter={chapter}
        localUnion={localUnion}
        agreementType={agreementType}
        states={states}
        effectiveFrom={effectiveFrom}
        effectiveTo={effectiveTo}
        shareToNationalDatabase={shareToNationalDatabase}
        dragActive={dragActive}
        uploadStatus={uploadStatus}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
        onClose={closeUploadModal}
        onAgreementNameChange={setAgreementName}
        onChapterChange={setChapter}
        onLocalUnionChange={setLocalUnion}
        onAgreementTypeChange={setAgreementType}
        onStatesChange={setStates}
        onEffectiveFromChange={setEffectiveFrom}
        onEffectiveToChange={setEffectiveTo}
        onShareToNationalDatabaseChange={setShareToNationalDatabase}
        onSetDragActive={setDragActive}
        onHandleDroppedFiles={handleDroppedFiles}
        onUpload={uploadAgreement}
      />

      {isEditModalOpen && (
        <div style={styles.modalOverlay} onClick={closeEditModal}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.sectionTitle}>Edit Agreement</div>
                <div style={styles.sectionSubtext}>
                  All fields are required. Update the stored metadata for this agreement.
                </div>
              </div>

              <button
                onClick={closeEditModal}
                disabled={isSavingEdit}
                style={{
                  ...styles.subtleBtn,
                  ...(isSavingEdit ? styles.btnDisabled : null),
                }}
              >
                Close
              </button>
            </div>

            <div style={styles.modalBody}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Agreement Name {requiredMark}</label>
                  <input
                    type="text"
                    value={editAgreementName}
                    onChange={(e) => setEditAgreementName(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Chapter {requiredMark}</label>
                  <input
                    type="text"
                    value={editChapter}
                    onChange={(e) => setEditChapter(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Local Union(s) {requiredMark}</label>
                  <input
                    type="text"
                    value={editLocalUnion}
                    onChange={(e) => setEditLocalUnion(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Agreement Type {requiredMark}</label>
                  <input
                    type="text"
                    value={editAgreementType}
                    onChange={(e) => setEditAgreementType(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Effective From {requiredMark}</label>
                  <input
                    type="date"
                    value={editEffectiveFrom}
                    onChange={(e) => setEditEffectiveFrom(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Effective To {requiredMark}</label>
                  <input
                    type="date"
                    value={editEffectiveTo}
                    onChange={(e) => setEditEffectiveTo(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>State(s) {requiredMark}</label>
                  <input
                    type="text"
                    value={editStates}
                    onChange={(e) => setEditStates(e.target.value)}
                    style={styles.input}
                    placeholder="e.g. LA or LA, MS"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--muted-strong)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editShareToNationalDatabase}
                      onChange={(e) =>
                        setEditShareToNationalDatabase(e.target.checked)
                      }
                    />
                    Share to National Agreement Database
                  </label>
                </div>
              </div>

              {editStatus && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                      gap: 12,
                    }}
                  >
                    <div style={{ color: "var(--muted-strong)", fontWeight: 700 }}>
                      {editStatus}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                      {getEditProgressPercent(editStatus)}%
                    </div>
                  </div>

                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(31, 58, 95, 0.10)",
                      overflow: "hidden",
                      border: "1px solid rgba(31, 58, 95, 0.08)",
                    }}
                  >
                    <div
                      style={{
                        width: `${getEditProgressPercent(editStatus)}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: "var(--brand-gradient)",
                        transition: "width 280ms ease",
                      }}
                    />
                  </div>
                </div>
              )}

              {editError && (
                <div style={{ ...styles.errorBox, marginTop: 16 }}>
                  <b>Save error:</b> {editError}
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSavingEdit}
                style={{
                  ...styles.btn,
                  ...(isSavingEdit ? styles.btnDisabled : null),
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={isSavingEdit}
                style={{
                  ...styles.primaryBtn,
                  ...(isSavingEdit ? styles.btnDisabled : null),
                }}
              >
                {isSavingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
