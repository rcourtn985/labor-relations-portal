"use client";

import React from "react";
import { manageAgreementsStyles as styles } from "./styles";

type UploadAgreementModalProps = {
  isOpen: boolean;
  isUploading: boolean;
  agreementName: string;
  agreementFiles: File[];
  chapter: string;
  localUnion: string;
  agreementType: string;
  states: string;
  shareToNationalDatabase: boolean;
  dragActive: boolean;
  uploadStatus: string | null;
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onAgreementNameChange: (value: string) => void;
  onChapterChange: (value: string) => void;
  onLocalUnionChange: (value: string) => void;
  onAgreementTypeChange: (value: string) => void;
  onStatesChange: (value: string) => void;
  onShareToNationalDatabaseChange: (checked: boolean) => void;
  onSetDragActive: (active: boolean) => void;
  onHandleDroppedFiles: (fileList: FileList | null) => void;
  onUpload: () => void;
};

function getUploadProgressPercent(status: string | null): number {
  if (!status) return 0;

  const value = status.toLowerCase();

  if (value.includes("preparing")) return 8;
  if (value.includes("storing original")) return 18;
  if (value.includes("extracting text")) return 32;
  if (value.includes("uploading to openai")) return 50;
  if (value.includes("indexing")) return 72;
  if (value.includes("refreshing agreements")) return 90;
  if (value.includes("done")) return 100;

  if (value.includes("uploading")) return 12;
  return 0;
}

export default function UploadAgreementModal({
  isOpen,
  isUploading,
  agreementName,
  agreementFiles,
  chapter,
  localUnion,
  agreementType,
  states,
  shareToNationalDatabase,
  dragActive,
  uploadStatus,
  uploadError,
  fileInputRef,
  onClose,
  onAgreementNameChange,
  onChapterChange,
  onLocalUnionChange,
  onAgreementTypeChange,
  onStatesChange,
  onShareToNationalDatabaseChange,
  onSetDragActive,
  onHandleDroppedFiles,
  onUpload,
}: UploadAgreementModalProps) {
  if (!isOpen) return null;

  const progressPercent = getUploadProgressPercent(uploadStatus);

  const dropZoneStyle: React.CSSProperties = {
    marginTop: 14,
    borderRadius: 10,
    border: dragActive
      ? "1px solid rgba(31, 58, 95, 0.55)"
      : "1px dashed rgba(91, 102, 122, 0.35)",
    background: dragActive ? "rgba(31, 58, 95, 0.04)" : "var(--panel-strong)",
    padding: 24,
    textAlign: "center",
    transition: "all 0.15s ease",
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.sectionTitle}>Upload Agreement</div>
            <div style={styles.sectionSubtext}>
              Add a new agreement file and record its agreement metadata.
            </div>
          </div>

          <button
            onClick={onClose}
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
            style={dropZoneStyle}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSetDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSetDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSetDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSetDragActive(false);
              onHandleDroppedFiles(e.dataTransfer.files);
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Drag and drop agreement files here
            </div>
            <div style={{ color: "var(--muted)" }}>
              Supports PDF, DOC, DOCX, and TXT
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => onHandleDroppedFiles(e.target.files)}
            />

            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={styles.btn}
              >
                Browse Files
              </button>
            </div>

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

                <div
                  style={{
                    display: "grid",
                    gap: 6,
                  }}
                >
                  {agreementFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.size}`}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "#fff",
                        border: "1px solid var(--border)",
                        fontSize: 14,
                      }}
                    >
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
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
                value={agreementName}
                onChange={(e) => onAgreementNameChange(e.target.value)}
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
                value={chapter}
                onChange={(e) => onChapterChange(e.target.value)}
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
                Local Union(s)
              </label>
              <input
                value={localUnion}
                onChange={(e) => onLocalUnionChange(e.target.value)}
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
                value={agreementType}
                onChange={(e) => onAgreementTypeChange(e.target.value)}
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
                value={states}
                onChange={(e) => onStatesChange(e.target.value)}
                style={styles.input}
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
                  checked={shareToNationalDatabase}
                  onChange={(e) =>
                    onShareToNationalDatabaseChange(e.target.checked)
                  }
                />
                Make available to National Database
              </label>

              <div
                style={{
                  marginTop: 6,
                  color: "var(--muted)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                If selected, this agreement can be searched by all authorized users
                in the system. Otherwise, it will remain limited to its
                chapter/private scope once access controls are wired in.
              </div>
            </div>
          </div>

          {uploadStatus && (
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
                  {uploadStatus}
                </div>
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {progressPercent}%
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
                    width: `${progressPercent}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "var(--brand-gradient)",
                    transition: "width 280ms ease",
                  }}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <div style={{ ...styles.errorBox, marginTop: 16 }}>
              <b>Upload error:</b> {uploadError}
            </div>
          )}
        </div>

        <div style={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
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
            onClick={onUpload}
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
  );
}