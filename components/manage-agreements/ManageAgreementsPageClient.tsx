"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import AgreementDatabaseCard from "./AgreementDatabaseCard";
import ManageAgreementsHero from "./ManageAgreementsHero";
import UploadAgreementModal from "./UploadAgreementModal";
import { manageAgreementsStyles as styles } from "./styles";
import {
  AgreementRow,
  KBFilesResponse,
  KBIndexResponse,
} from "./types";

export default function ManageAgreementsPageClient() {
  const [kbIndex, setKbIndex] = useState<KBIndexResponse | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [loadingCollections, setLoadingCollections] = useState(false);

  const [filesLoading, setFilesLoading] = useState(false);
  const [filesData, setFilesData] = useState<KBFilesResponse | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [agreementName, setAgreementName] = useState("");
  const [agreementFiles, setAgreementFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [chapter, setChapter] = useState("");
  const [localUnion, setLocalUnion] = useState("");
  const [agreementType, setAgreementType] = useState("");
  const [states, setStates] = useState("");
  const [shareToNationalDatabase, setShareToNationalDatabase] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAgreementId, setEditingAgreementId] = useState("");
  const [editAgreementName, setEditAgreementName] = useState("");
  const [editChapter, setEditChapter] = useState("");
  const [editLocalUnion, setEditLocalUnion] = useState("");
  const [editAgreementType, setEditAgreementType] = useState("");
  const [editStates, setEditStates] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadCollections() {
    const res = await fetch("/api/kb/list");
    const data = (await res.json()) as KBIndexResponse;
    setKbIndex(data);
    return data;
  }

  async function loadFiles(collectionId: string) {
    if (!collectionId) {
      setFilesData(null);
      return;
    }

    setFilesLoading(true);
    setError(null);
    setFilesData(null);

    try {
      const res = await fetch(`/api/kb/files?kbId=${encodeURIComponent(collectionId)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Failed to load agreements.");
        return;
      }

      setFilesData(data as KBFilesResponse);
    } catch {
      setError("Failed to load agreements.");
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
    setShareToNationalDatabase(false);
    setUploadError(null);
    setUploadStatus(null);
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openUploadModal() {
    resetUploadForm();
    setIsUploadModalOpen(true);
  }

  function closeUploadModal() {
    if (isUploading) return;
    setIsUploadModalOpen(false);
  }

  function handleDroppedFiles(fileList: FileList | null) {
    if (!fileList) return;
    setAgreementFiles(Array.from(fileList));
  }

  async function uploadAgreement() {
    setUploadError(null);
    setUploadStatus(null);

    if (agreementFiles.length === 0) {
      setUploadError("Please select at least one agreement file.");
      return;
    }

    if (!chapter.trim()) {
      setUploadError("Please enter a Chapter.");
      return;
    }

    if (!states.trim()) {
      setUploadError("Please enter State(s), for example LA or LA, MS.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus("Uploading and indexing agreement files…");

      const form = new FormData();
      form.append("name", buildCollectionName());

      for (const file of agreementFiles) {
        form.append("files", file);
      }

      form.append("isCba", "true");
      form.append("shareToCbas", shareToNationalDatabase ? "true" : "false");
      form.append("chapter", chapter.trim());
      form.append("localUnion", localUnion.trim());
      form.append("cbaType", agreementType.trim());
      form.append("state", states.trim());

      const res = await fetch("/api/kb/create", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Upload failed");
      }

      setUploadStatus("Upload complete. Refreshing agreements…");

      const refreshed = await loadCollections();

      if (data?.id) {
        setSelectedCollectionId(data.id);
        await loadFiles(data.id);
      } else if (refreshed?.userKbs?.length) {
        const newest = refreshed.userKbs[0];
        setSelectedCollectionId(newest.id);
        await loadFiles(newest.id);
      }

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

    try {
      setIsSavingEdit(true);

      const res = await fetch(`/api/agreements/${encodeURIComponent(editingAgreementId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agreementName: editAgreementName,
          chapter: editChapter,
          localUnion: editLocalUnion,
          agreementType: editAgreementType,
          states: editStates,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to save changes.");
      }

      setEditStatus("Saved.");
      await loadFiles(selectedCollectionId);
      setIsEditModalOpen(false);
    } catch (e: any) {
      setEditError(e?.message ?? "Failed to save changes.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  function openUploadedFile(_row: AgreementRow) {
    setError(
      "Opening the original file is not available yet. OpenAI blocks downloading assistants-purpose files, so we will need to store original uploads in our own storage to support this."
    );
  }

  useEffect(() => {
    (async () => {
      try {
        setLoadingCollections(true);
        const data = await loadCollections();

        const firstUserCollection = data?.userKbs?.[0];
        if (firstUserCollection) {
          setSelectedCollectionId(firstUserCollection.id);
          await loadFiles(firstUserCollection.id);
        } else {
          setSelectedCollectionId("");
          setFilesData(null);
        }
      } catch {
        setError("Failed to load agreement collections.");
      } finally {
        setLoadingCollections(false);
      }
    })();
  }, []);

  const agreementCollections = kbIndex?.userKbs ?? [];

  const sortedFiles =
    filesData?.files
      ? [...filesData.files].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
      : [];

  const agreementRows: AgreementRow[] = useMemo(() => {
    if (!filesData?.files?.length) return [];

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
    }));
  }, [filesData, sortedFiles]);

  const selectedCollectionName =
    agreementCollections.find((collection) => collection.id === selectedCollectionId)?.name ??
    "";

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

      <AgreementDatabaseCard
        selectedCollectionId={selectedCollectionId}
        selectedCollectionName={selectedCollectionName}
        agreementCollections={agreementCollections}
        filesLoading={filesLoading}
        loadingCollections={loadingCollections}
        filesData={filesData}
        agreementRows={agreementRows}
        onSelectedCollectionChange={setSelectedCollectionId}
        onLoadFiles={() => loadFiles(selectedCollectionId)}
        onRefreshCollections={() =>
          loadCollections().catch(() => setError("Failed to refresh collections."))
        }
        onOpenUploadedFile={openUploadedFile}
        onOpenEditModal={openEditModal}
      />

      <UploadAgreementModal
        isOpen={isUploadModalOpen}
        isUploading={isUploading}
        agreementName={agreementName}
        agreementFiles={agreementFiles}
        chapter={chapter}
        localUnion={localUnion}
        agreementType={agreementType}
        states={states}
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
                  Update the stored metadata for this uploaded agreement.
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
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--muted-strong)",
                    }}
                  >
                    Agreement Name
                  </label>
                  <input
                    type="text"
                    value={editAgreementName}
                    onChange={(e) => setEditAgreementName(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--muted-strong)",
                    }}
                  >
                    Chapter
                  </label>
                  <input
                    type="text"
                    value={editChapter}
                    onChange={(e) => setEditChapter(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--muted-strong)",
                    }}
                  >
                    Local Union
                  </label>
                  <input
                    type="text"
                    value={editLocalUnion}
                    onChange={(e) => setEditLocalUnion(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--muted-strong)",
                    }}
                  >
                    Agreement Type
                  </label>
                  <input
                    type="text"
                    value={editAgreementType}
                    onChange={(e) => setEditAgreementType(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--muted-strong)",
                    }}
                  >
                    State(s)
                  </label>
                  <input
                    type="text"
                    value={editStates}
                    onChange={(e) => setEditStates(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              {editStatus && <div style={styles.successBox}>{editStatus}</div>}

              {editError && (
                <div style={styles.errorBox}>
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