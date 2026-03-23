"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type KBEntry = { id: string; name: string; vectorStoreId: string };
type KBIndexResponse = { central: KBEntry; systemKbs?: KBEntry[]; userKbs: KBEntry[] };

type KBFilesResponse = {
  kbId: string;
  kbName: string;
  vectorStoreId: string;
  files: {
    id: string;
    file_id: string;
    filename: string | null;
    created_at: number;
    status: string;
    chapter?: string | null;
    localUnion?: string | null;
    agreementType?: string | null;
    states?: string | null;
    fileUrl?: string | null;
  }[];
};

type AgreementRow = {
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
};

export default function ManageAgreementsPage() {
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

  const styles = {
    page: {
      maxWidth: 1320,
      margin: "0 auto",
      padding: "28px 20px 24px",
      color: "var(--foreground)",
    } as React.CSSProperties,

    hero: {
      borderRadius: 14,
      border: "1px solid rgba(31, 58, 95, 0.12)",
      background:
        "linear-gradient(135deg, rgba(31, 58, 95, 0.98) 0%, rgba(38, 72, 111, 0.98) 100%)",
      color: "#fff",
      padding: "22px 24px",
      boxShadow: "var(--shadow-strong)",
    } as React.CSSProperties,

    heroLabel: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      opacity: 0.78,
      marginBottom: 10,
    } as React.CSSProperties,

    subtext: {
      color: "var(--muted)",
      fontSize: 13,
      marginTop: 6,
      lineHeight: 1.5,
    } as React.CSSProperties,

    heroSubtext: {
      marginTop: 12,
      color: "rgba(255,255,255,0.84)",
      fontSize: 15,
      lineHeight: 1.6,
      maxWidth: 820,
    } as React.CSSProperties,

    card: {
      marginTop: 18,
      border: "1px solid var(--border)",
      borderRadius: 12,
      background: "var(--panel)",
      boxShadow: "var(--shadow-soft)",
      overflow: "hidden",
    } as React.CSSProperties,

    cardHeader: {
      padding: "14px 16px",
      borderBottom: "1px solid var(--border)",
      background: "var(--panel-strong)",
    } as React.CSSProperties,

    cardBody: {
      padding: 16,
    } as React.CSSProperties,

    sectionTitle: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--muted-strong)",
      marginBottom: 4,
    } as React.CSSProperties,

    sectionSubtext: {
      color: "var(--muted)",
      fontSize: 13,
      lineHeight: 1.5,
    } as React.CSSProperties,

    btn: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid var(--button-border)",
      background: "#ffffff",
      color: "var(--foreground)",
      cursor: "pointer",
      fontWeight: 700,
      letterSpacing: 0.1,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
    } as React.CSSProperties,

    primaryBtn: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #17314f",
      background: "var(--brand-gradient)",
      color: "#ffffff",
      cursor: "pointer",
      fontWeight: 700,
      letterSpacing: 0.1,
      boxShadow: "var(--shadow-soft)",
    } as React.CSSProperties,

    subtleBtn: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid var(--border)",
      background: "var(--panel-strong)",
      color: "var(--foreground)",
      cursor: "pointer",
      fontWeight: 600,
    } as React.CSSProperties,

    btnDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
    } as React.CSSProperties,

    input: {
      width: "100%",
      padding: 12,
      borderRadius: 8,
      border: "1px solid var(--input-border)",
      background: "var(--input-bg)",
      color: "var(--foreground)",
      fontSize: 14,
      outline: "none",
    } as React.CSSProperties,

    select: {
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid var(--input-border)",
      background: "var(--input-bg)",
      color: "var(--foreground)",
      minWidth: 320,
      fontSize: 14,
    } as React.CSSProperties,

    checkboxRow: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      fontWeight: 700,
      flexWrap: "wrap",
    } as React.CSSProperties,

    errorBox: {
      marginTop: 14,
      padding: 12,
      borderRadius: 8,
      border: "1px solid rgba(169, 68, 68, 0.20)",
      background: "rgba(169, 68, 68, 0.06)",
      color: "var(--foreground)",
    } as React.CSSProperties,

    successBox: {
      marginTop: 14,
      padding: 12,
      borderRadius: 8,
      border: "1px solid rgba(43, 110, 82, 0.20)",
      background: "rgba(43, 110, 82, 0.06)",
      color: "var(--foreground)",
    } as React.CSSProperties,

    tableWrap: {
      overflowX: "auto",
      borderTop: "1px solid var(--border)",
      background: "#fff",
    } as React.CSSProperties,

    table: {
      width: "100%",
      minWidth: 1240,
      borderCollapse: "collapse",
      color: "var(--foreground)",
    } as React.CSSProperties,

    th: {
      textAlign: "left",
      borderBottom: "1px solid var(--border)",
      padding: "12px 12px",
      background: "var(--table-header)",
      color: "var(--muted-strong)",
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      position: "sticky",
      top: 0,
    } as React.CSSProperties,

    td: {
      borderBottom: "1px solid rgba(214, 222, 232, 0.85)",
      padding: "12px 12px",
      color: "var(--foreground)",
      fontSize: 14,
      verticalAlign: "middle",
      whiteSpace: "nowrap",
      background: "#fff",
    } as React.CSSProperties,

    toolbarChip: {
      display: "inline-flex",
      alignItems: "center",
      padding: "5px 9px",
      borderRadius: 999,
      background: "rgba(31, 58, 95, 0.08)",
      color: "var(--accent)",
      fontWeight: 600,
      fontSize: 13,
    } as React.CSSProperties,

    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15, 24, 40, 0.42)",
      backdropFilter: "blur(4px)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    } as React.CSSProperties,

    modalCard: {
      width: "100%",
      maxWidth: 880,
      maxHeight: "90vh",
      overflowY: "auto",
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "var(--panel)",
      boxShadow: "var(--shadow-strong)",
      overflowX: "hidden",
    } as React.CSSProperties,

    modalHeader: {
      padding: "16px 18px",
      borderBottom: "1px solid var(--border)",
      background: "var(--panel-strong)",
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "center",
      flexWrap: "wrap",
    } as React.CSSProperties,

    modalBody: {
      padding: 18,
      background: "#fff",
    } as React.CSSProperties,

    modalFooter: {
      padding: "16px 18px",
      borderTop: "1px solid var(--border)",
      background: "var(--panel-strong)",
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      flexWrap: "wrap",
    } as React.CSSProperties,

    dropZone: {
      marginTop: 14,
      borderRadius: 10,
      border: dragActive
        ? "1px solid rgba(31, 58, 95, 0.55)"
        : "1px dashed rgba(91, 102, 122, 0.35)",
      background: dragActive ? "rgba(31, 58, 95, 0.04)" : "var(--panel-strong)",
      padding: 24,
      textAlign: "center",
      transition: "all 0.15s ease",
    } as React.CSSProperties,

    badge: {
      display: "inline-block",
      padding: "3px 8px",
      borderRadius: 999,
      border: "1px solid var(--border)",
      background: "var(--panel)",
      color: "var(--muted-strong)",
      fontSize: 12,
      fontWeight: 600,
    } as React.CSSProperties,
  };

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
      <div style={styles.hero}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 860 }}>
            <div style={styles.heroLabel}>Agreement Administration</div>
            <h1
              style={{
                margin: 0,
                fontSize: 34,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                color: "#ffffff",
              }}
            >
              Manage Agreements
            </h1>
            <div style={styles.heroSubtext}>
              Upload, review, and update collective bargaining agreements in a
              structured administrative workspace designed for agreement operations.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={openUploadModal} style={styles.primaryBtn}>
              Upload Agreement
            </button>

            <a href="/" style={{ textDecoration: "none" }}>
              <button
                style={{
                  ...styles.btn,
                  background: "rgba(255,255,255,0.10)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "none",
                }}
              >
                ← Back to Chat
              </button>
            </a>
          </div>
        </div>
      </div>

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

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={styles.sectionTitle}>Agreement Database</div>
              <div style={styles.sectionSubtext}>
                Review uploaded agreements, inspect scoped records, and update stored
                agreement metadata.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {selectedCollectionName && (
                <span style={styles.toolbarChip}>Collection: {selectedCollectionName}</span>
              )}

              {filesData?.files?.length ? (
                <span style={styles.toolbarChip}>Rows: {filesData.files.length}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div style={styles.cardBody}>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              style={styles.select}
            >
              <option value="">Select an upload collection</option>
              {agreementCollections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadFiles(selectedCollectionId)}
              disabled={!selectedCollectionId || filesLoading}
              style={{
                ...styles.btn,
                ...((!selectedCollectionId || filesLoading) ? styles.btnDisabled : null),
              }}
            >
              {filesLoading ? "Loading…" : "Load"}
            </button>

            <button
              onClick={() =>
                loadCollections().catch(() => setError("Failed to refresh collections."))
              }
              disabled={loadingCollections}
              style={{
                ...styles.subtleBtn,
                ...(loadingCollections ? styles.btnDisabled : null),
              }}
            >
              {loadingCollections ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div style={styles.tableWrap}>
          {filesLoading && (
            <div style={{ padding: 16, color: "var(--muted)" }}>Loading agreements…</div>
          )}

          {!filesLoading && !filesData && (
            <div style={{ padding: 16, color: "var(--muted)" }}>
              Select a collection and click Load to view uploaded agreements.
            </div>
          )}

          {!filesLoading && filesData && agreementRows.length === 0 && (
            <div style={{ padding: 16, color: "var(--muted)" }}>
              No agreement files found in this collection.
            </div>
          )}

          {!filesLoading && filesData && agreementRows.length > 0 && (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Agreement Name</th>
                  <th style={styles.th}>Chapter</th>
                  <th style={styles.th}>Local Union</th>
                  <th style={styles.th}>Agreement Type</th>
                  <th style={styles.th}>States</th>
                  <th style={styles.th}>File Name</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Uploaded</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agreementRows.map((row) => (
                  <tr key={row.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{row.agreementName}</div>
                    </td>
                    <td style={styles.td}>{row.chapter}</td>
                    <td style={styles.td}>{row.localUnion}</td>
                    <td style={styles.td}>{row.agreementType}</td>
                    <td style={styles.td}>{row.states}</td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        onClick={() => openUploadedFile(row)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          color: "var(--accent)",
                          textDecoration: "underline",
                          cursor: "pointer",
                          font: "inherit",
                          fontWeight: 600,
                          boxShadow: "none",
                        }}
                        title="Open uploaded file"
                      >
                        {row.filename}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge}>{row.status || "unknown"}</span>
                    </td>
                    <td style={styles.td}>
                      {row.uploadedAt
                        ? new Date(row.uploadedAt * 1000).toLocaleString()
                        : ""}
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        onClick={() => openEditModal(row)}
                        style={styles.subtleBtn}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isUploadModalOpen && (
        <div style={styles.modalOverlay} onClick={closeUploadModal}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.sectionTitle}>Upload Agreement</div>
                <div style={styles.sectionSubtext}>
                  Add a new agreement file and record its agreement metadata.
                </div>
              </div>

              <button
                onClick={closeUploadModal}
                disabled={isUploading}
                style={{
                  ...styles.subtleBtn,
                  ...(isUploading ? styles.btnDisabled : null),
                }}
              >
                Close
              </button>
            </div>

            <div style={styles.modalBody}>
              <div
                style={styles.dropZone}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  handleDroppedFiles(e.dataTransfer.files);
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Drag and drop agreement files here
                </div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
                  Supports PDF, DOC, DOCX, and TXT
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  style={{ display: "none" }}
                  onChange={(e) => handleDroppedFiles(e.target.files)}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={styles.btn}
                >
                  Browse Files
                </button>

                {agreementFiles.length > 0 && (
                  <div style={{ marginTop: 14, textAlign: "left" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 8,
                        color: "var(--muted-strong)",
                      }}
                    >
                      Selected files
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {agreementFiles.map((file) => (
                        <div key={`${file.name}-${file.size}`} style={{ color: "var(--muted)" }}>
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: 16,
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
                    placeholder="Optional display name"
                    value={agreementName}
                    onChange={(e) => setAgreementName(e.target.value)}
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
                    placeholder="Chapter"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
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
                    placeholder="Local Union"
                    value={localUnion}
                    onChange={(e) => setLocalUnion(e.target.value)}
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
                    placeholder="Agreement Type"
                    value={agreementType}
                    onChange={(e) => setAgreementType(e.target.value)}
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
                    placeholder="Example: LA or LA, MS"
                    value={states}
                    onChange={(e) => setStates(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16, ...styles.checkboxRow }}>
                <input
                  id="shareToNationalDatabase"
                  type="checkbox"
                  checked={shareToNationalDatabase}
                  onChange={(e) => setShareToNationalDatabase(e.target.checked)}
                />
                <label htmlFor="shareToNationalDatabase">
                  Make available to National Database
                </label>
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "var(--muted)",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                If selected, this agreement can be searched by all authorized users in
                the system. Otherwise, it will remain limited to its chapter/private
                scope once access controls are wired in.
              </div>

              {uploadStatus && <div style={styles.successBox}>{uploadStatus}</div>}

              {uploadError && (
                <div style={styles.errorBox}>
                  <b>Upload error:</b> {uploadError}
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={closeUploadModal}
                disabled={isUploading}
                style={{
                  ...styles.btn,
                  ...(isUploading ? styles.btnDisabled : null),
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={uploadAgreement}
                disabled={isUploading}
                style={{
                  ...styles.primaryBtn,
                  ...(isUploading ? styles.btnDisabled : null),
                }}
              >
                {isUploading ? "Uploading…" : "Upload Agreement"}
              </button>
            </div>
          </div>
        </div>
      )}

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