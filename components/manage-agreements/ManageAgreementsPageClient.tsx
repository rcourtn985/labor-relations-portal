"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import AgreementDatabaseCard from "./AgreementDatabaseCard";
import AgreementPreviewPanel from "./AgreementPreviewPanel";
import EditAgreementModal from "./EditAgreementModal";
import ManageAgreementsHero from "./ManageAgreementsHero";
import UploadAgreementModal from "./UploadAgreementModal";
import { ChapterOption } from "./SearchableChapterSelect";
import { manageAgreementsStyles as styles } from "./styles";
import {
  AgreementListResponse,
  AgreementRow,
  AgreementSearchResponse,
  AgreementSort,
} from "./types";
import { useManageAgreementsAccess } from "./hooks/useManageAgreementsAccess";
import {
  AgreementPreviewResponse,
  ExtractedMetadata,
  SearchResultRow,
  isManagedChapter,
  isVisibleToChapterAdmin,
} from "./manageAgreementsPageUtils";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORT: AgreementSort = "uploaded_desc";

export default function ManageAgreementsPageClient() {
  const {
    permissionsLoading,
    permissions,
    publicChapterOptions,
    publicChaptersLoading,
  } = useManageAgreementsAccess();

  const [filesLoading, setFilesLoading] = useState(false);
  const [allAgreementRows, setAllAgreementRows] = useState<AgreementRow[]>([]);

  const [chapterOptions, setChapterOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [localUnionOptions, setLocalUnionOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [agreementTypeOptions, setAgreementTypeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [stateOptions, setStateOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [totalRows, setTotalRows] = useState(0);
  const [filteredRowsCount, setFilteredRowsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState<AgreementSort>(DEFAULT_SORT);

  const [searchCurrentPage, setSearchCurrentPage] = useState(1);
  const [searchTotalCount, setSearchTotalCount] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(1);

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
  const [includeNationalDatabase, setIncludeNationalDatabase] = useState(true);
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
  const [isDeletingFromModal, setIsDeletingFromModal] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<AgreementPreviewResponse | null>(null);
  const [previewInitialSearchQuery, setPreviewInitialSearchQuery] = useState("");

  const [isDeletingAgreementId, setIsDeletingAgreementId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function toggleSortForColumn(column: string) {
    setSort((current) => {
      switch (column) {
        case "agreementName":
          return current === "name_asc" ? "name_desc" : "name_asc";
        case "chapter":
          return current === "chapter_asc" ? "chapter_desc" : "chapter_asc";
        case "localUnion":
          return current === "local_union_asc"
            ? "local_union_desc"
            : "local_union_asc";
        case "agreementType":
          return current === "agreement_type_asc"
            ? "agreement_type_desc"
            : "agreement_type_asc";
        case "states":
          return current === "states_asc" ? "states_desc" : "states_asc";
        case "effectiveFrom":
          return current === "effective_asc" ? "effective_desc" : "effective_asc";
        case "uploadedAt":
        default:
          return current === "uploaded_desc" ? "uploaded_asc" : "uploaded_desc";
      }
    });
  }

  async function loadAllAgreements() {
    setFilesLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (agreementNameQuery.trim()) {
        params.set("agreementName", agreementNameQuery.trim());
      }

      for (const value of selectedChapters) {
        params.append("chapters", value);
      }

      for (const value of selectedLocalUnions) {
        params.append("localUnions", value);
      }

      for (const value of selectedAgreementTypes) {
        params.append("agreementTypes", value);
      }

      for (const value of selectedStates) {
        params.append("states", value);
      }

      params.set("includeNationalDatabase", String(includeNationalDatabase));
      params.set("showExpired", String(showExpired));
      params.set("page", String(currentPage));
      params.set("pageSize", String(pageSize));
      params.set("sort", sort);

      const res = await fetch(`/api/agreements?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as AgreementListResponse & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load agreements.");
      }

      setAllAgreementRows(data.rows ?? []);
      setChapterOptions(data.filterOptions?.chapterOptions ?? []);
      setLocalUnionOptions(data.filterOptions?.localUnionOptions ?? []);
      setAgreementTypeOptions(data.filterOptions?.agreementTypeOptions ?? []);
      setStateOptions(data.filterOptions?.stateOptions ?? []);
      setTotalRows(data.totalRows ?? 0);
      setFilteredRowsCount(data.filteredRowsCount ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setCurrentPage(data.page ?? 1);
      setSort(data.sort ?? DEFAULT_SORT);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load agreements.");
      setAllAgreementRows([]);
      setChapterOptions([]);
      setLocalUnionOptions([]);
      setAgreementTypeOptions([]);
      setStateOptions([]);
      setTotalRows(0);
      setFilteredRowsCount(0);
      setTotalPages(1);
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

  function clearAll() {
    setAgreementNameQuery("");
    setContentSearchQuery("");
    setSearchRows(null);
    setSearchError(null);
    setSearchTotalCount(0);
    setSearchTotalPages(1);
    setSearchCurrentPage(1);
    setSelectedChapters([]);
    setSelectedLocalUnions([]);
    setSelectedAgreementTypes([]);
    setSelectedStates([]);
    setIncludeNationalDatabase(true);
    setShowExpired(false);
    setCurrentPage(1);
    setSort(DEFAULT_SORT);
  }

  function openUploadModal() {
    if (!permissions.canManageAgreements) return;
    resetUploadForm();

    if (!permissions.isSystemAdmin && permissions.managedChapterNames.length > 0) {
      setChapter(permissions.managedChapterNames[0]);
    }

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

      if (data.localUnion) setLocalUnion(data.localUnion);
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
    if (!permissions.canManageAgreements) {
      setUploadError("You do not have permission to upload agreements.");
      return;
    }

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
      setUploadError("Please select a Chapter.");
      return;
    }

    if (
      permissions.isChapterAdmin &&
      !permissions.isSystemAdmin &&
      !isManagedChapter(chapter, permissions.managedChapterNames)
    ) {
      setUploadError("Chapter Admins can only upload agreements for assigned chapters.");
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
      await loadAllAgreements();

      setUploadStatus("Done.");
      setIsUploadModalOpen(false);
      resetUploadForm();
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function canManageAgreementRow(row: AgreementRow): boolean {
    if (permissions.isSystemAdmin) return true;
    if (!permissions.isChapterAdmin) return false;
    return isManagedChapter(row.chapter, permissions.managedChapterNames);
  }

  function openEditModal(row: AgreementRow) {
    if (!permissions.canManageAgreements) return;
    if (!canManageAgreementRow(row)) return;

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
    if (isSavingEdit || isDeletingFromModal) return;
    setIsEditModalOpen(false);
  }

  async function saveEdit() {
    if (!permissions.canManageAgreements) {
      setEditError("You do not have permission to edit agreements.");
      return;
    }

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
      setEditError("Please select a Chapter.");
      return;
    }

    if (
      permissions.isChapterAdmin &&
      !permissions.isSystemAdmin &&
      !isManagedChapter(editChapter, permissions.managedChapterNames)
    ) {
      setEditError("Chapter Admins can only edit agreements for assigned chapters.");
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
        await runContentSearch(contentSearchQuery, searchCurrentPage);
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
    if (!permissions.canManageAgreements) {
      setError("You do not have permission to delete agreements.");
      return;
    }

    if (!canManageAgreementRow(row)) {
      setError("Chapter Admins can only delete agreements for assigned chapters.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${row.agreementName}"?\n\nThis will permanently remove the agreement and its file from the database. This cannot be undone.`
    );
    if (!confirmed) return;

    const deletingFromEditModal = isEditModalOpen && editingAgreementId === row.id;

    setIsDeletingAgreementId(row.id);
    setError(null);

    if (deletingFromEditModal) {
      setIsDeletingFromModal(true);
    }

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

      if (deletingFromEditModal) {
        setIsEditModalOpen(false);
      }

      await loadAllAgreements().catch(() =>
        setError("Failed to refresh agreements.")
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete agreement.");
    } finally {
      setIsDeletingAgreementId(null);
      if (deletingFromEditModal) {
        setIsDeletingFromModal(false);
      }
    }
  }

  async function runContentSearch(query: string, page: number = 1) {
    const trimmed = query.trim();

    if (!trimmed) {
      setSearchRows(null);
      setSearchError(null);
      setSearchTotalCount(0);
      setSearchTotalPages(1);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams();
      params.set("q", trimmed);
      params.set("agreementName", agreementNameQuery.trim());
      params.set("includeNationalDatabase", String(includeNationalDatabase));
      params.set("showExpired", String(showExpired));
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("sort", sort);

      for (const value of selectedChapters) {
        params.append("chapters", value);
      }

      for (const value of selectedLocalUnions) {
        params.append("localUnions", value);
      }

      for (const value of selectedAgreementTypes) {
        params.append("agreementTypes", value);
      }

      for (const value of selectedStates) {
        params.append("states", value);
      }

      const res = await fetch(`/api/agreements/search?${params.toString()}`);
      const data = (await res.json()) as AgreementSearchResponse & { error?: string };

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
          fileUrl: row.id
            ? `/api/agreements/${encodeURIComponent(row.id)}/file`
            : null,
          sharedToCbas: Boolean(row.sharedToCbas),
          effectiveFrom: row.effectiveFrom ?? null,
          effectiveTo: row.effectiveTo ?? null,
        })
      );

      setSearchRows(rows);
      setSearchTotalCount(data.count ?? 0);
      setSearchTotalPages(data.totalPages ?? 1);
      setSearchCurrentPage(data.page ?? 1);
    } catch (e: any) {
      setSearchError(e?.message ?? "Search failed.");
      setSearchRows([]);
      setSearchTotalCount(0);
      setSearchTotalPages(1);
    } finally {
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    if (searchRows !== null) {
      return;
    }

    void loadAllAgreements();
  }, [
    searchRows,
    currentPage,
    agreementNameQuery,
    selectedChapters,
    selectedLocalUnions,
    selectedAgreementTypes,
    selectedStates,
    includeNationalDatabase,
    showExpired,
    pageSize,
    sort,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    agreementNameQuery,
    selectedChapters,
    selectedLocalUnions,
    selectedAgreementTypes,
    selectedStates,
    includeNationalDatabase,
    showExpired,
    sort,
  ]);

  useEffect(() => {
    setSearchCurrentPage(1);
  }, [
    contentSearchQuery,
    agreementNameQuery,
    selectedChapters,
    selectedLocalUnions,
    selectedAgreementTypes,
    selectedStates,
    includeNationalDatabase,
    showExpired,
    sort,
  ]);

  useEffect(() => {
    const trimmed = contentSearchQuery.trim();

    if (!trimmed) {
      setSearchRows(null);
      setSearchError(null);
      setSearchLoading(false);
      setSearchTotalCount(0);
      setSearchTotalPages(1);
      return;
    }

    const timeout = window.setTimeout(() => {
      runContentSearch(trimmed, searchCurrentPage);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    contentSearchQuery,
    searchCurrentPage,
    pageSize,
    agreementNameQuery,
    selectedChapters,
    selectedLocalUnions,
    selectedAgreementTypes,
    selectedStates,
    includeNationalDatabase,
    showExpired,
    sort,
  ]);

  const managedChapterPickerOptions = useMemo<ChapterOption[]>(() => {
    if (permissions.isSystemAdmin) {
      return publicChapterOptions;
    }

    if (publicChapterOptions.length > 0 && permissions.managedChapterIds.length > 0) {
      const managedIdSet = new Set(permissions.managedChapterIds);
      const fromPublic = publicChapterOptions.filter((option) =>
        managedIdSet.has(option.id)
      );

      if (fromPublic.length > 0) {
        return fromPublic;
      }
    }

    return permissions.managedChapterNames
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        id: name,
        name,
        code: null,
      }));
  }, [
    permissions.isSystemAdmin,
    permissions.managedChapterIds,
    permissions.managedChapterNames,
    publicChapterOptions,
  ]);

  const scopedRows = useMemo(() => {
    if (permissions.isSystemAdmin) return allAgreementRows;
    if (!permissions.isChapterAdmin) return allAgreementRows;

    return allAgreementRows.filter((row) =>
      isVisibleToChapterAdmin(row, permissions.managedChapterNames)
    );
  }, [
    allAgreementRows,
    permissions.isSystemAdmin,
    permissions.isChapterAdmin,
    permissions.managedChapterNames,
  ]);

  const baseRows = useMemo(() => {
    const source = searchRows ?? scopedRows;

    if (permissions.isSystemAdmin || !permissions.isChapterAdmin) {
      return source;
    }

    return source.filter((row) =>
      isVisibleToChapterAdmin(row, permissions.managedChapterNames)
    );
  }, [
    searchRows,
    scopedRows,
    permissions.isSystemAdmin,
    permissions.isChapterAdmin,
    permissions.managedChapterNames,
  ]);

  const showPreviewPane = isPreviewOpen;
  const contentSearchActive = searchRows !== null;

  return (
    <div style={styles.page}>
      <ManageAgreementsHero
        onOpenUploadModal={openUploadModal}
        canManageAgreements={!permissionsLoading && permissions.canManageAgreements}
      />

      {!permissionsLoading && !permissions.canManageAgreements ? (
        <div style={styles.errorBox}>
          <b>Read-only access:</b> Upload, edit, and delete are restricted to
          System Admins and Chapter Admins.
        </div>
      ) : null}

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
            filesLoading={filesLoading}
            searchLoading={searchLoading}
            searchError={searchError}
            agreementRows={scopedRows}
            agreementRowsTotal={totalRows}
            filteredAgreementRows={baseRows}
            filteredAgreementRowsCount={
              contentSearchActive ? searchTotalCount : filteredRowsCount
            }
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
            includeNationalDatabase={includeNationalDatabase}
            showExpired={showExpired}
            sort={sort}
            hideContentSearch={isPreviewOpen}
            currentPage={contentSearchActive ? searchCurrentPage : currentPage}
            pageSize={pageSize}
            totalPages={contentSearchActive ? searchTotalPages : totalPages}
            showPagination
            onToggleSort={toggleSortForColumn}
            onPageChange={contentSearchActive ? setSearchCurrentPage : setCurrentPage}
            onAgreementNameQueryChange={setAgreementNameQuery}
            onContentSearchQueryChange={setContentSearchQuery}
            onSelectedChaptersChange={setSelectedChapters}
            onSelectedLocalUnionsChange={setSelectedLocalUnions}
            onSelectedAgreementTypesChange={setSelectedAgreementTypes}
            onSelectedStatesChange={setSelectedStates}
            onIncludeNationalDatabaseChange={setIncludeNationalDatabase}
            onShowExpiredChange={setShowExpired}
            onClearAll={clearAll}
            onRefreshAgreements={() =>
              loadAllAgreements().catch(() =>
                setError("Failed to refresh agreements.")
              )
            }
            onOpenUploadedFile={openUploadedFile}
            onOpenEditModal={openEditModal}
            onDeleteAgreement={deleteAgreement}
            isDeletingAgreementId={isDeletingAgreementId}
            canManageAgreements={!permissionsLoading && permissions.canManageAgreements}
            canManageAgreement={canManageAgreementRow}
          />
        </div>

        {showPreviewPane && (
          <AgreementPreviewPanel
            previewLoading={previewLoading}
            previewError={previewError}
            previewData={previewData}
            previewInitialSearchQuery={previewInitialSearchQuery}
            onClose={closePreviewPanel}
          />
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
        chapterOptions={managedChapterPickerOptions}
        chapterLocked={
          !permissions.isSystemAdmin &&
          managedChapterPickerOptions.length === 1
        }
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

      <EditAgreementModal
        isOpen={isEditModalOpen}
        isSavingEdit={isSavingEdit}
        isDeletingAgreement={isDeletingFromModal}
        editAgreementName={editAgreementName}
        editChapter={editChapter}
        editLocalUnion={editLocalUnion}
        editAgreementType={editAgreementType}
        editStates={editStates}
        editEffectiveFrom={editEffectiveFrom}
        editEffectiveTo={editEffectiveTo}
        editShareToNationalDatabase={editShareToNationalDatabase}
        editError={editError}
        editStatus={editStatus}
        chapterOptions={managedChapterPickerOptions}
        chapterLocked={
          !permissions.isSystemAdmin &&
          managedChapterPickerOptions.length === 1
        }
        publicChaptersLoading={publicChaptersLoading}
        onClose={closeEditModal}
        onSave={saveEdit}
        onDelete={() => {
          const row = allAgreementRows.find((item) => item.id === editingAgreementId);
          if (row) {
            void deleteAgreement(row);
          }
        }}
        onEditAgreementNameChange={setEditAgreementName}
        onEditChapterChange={setEditChapter}
        onEditLocalUnionChange={setEditLocalUnion}
        onEditAgreementTypeChange={setEditAgreementType}
        onEditStatesChange={setEditStates}
        onEditEffectiveFromChange={setEditEffectiveFrom}
        onEditEffectiveToChange={setEditEffectiveTo}
        onEditShareToNationalDatabaseChange={setEditShareToNationalDatabase}
      />
    </div>
  );
}