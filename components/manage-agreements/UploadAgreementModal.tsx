"use client";

import React from "react";
import { manageAgreementsStyles as styles } from "./styles";

type UploadAgreementModalProps = {
  isOpen: boolean;
  isUploading: boolean;
  isExtracting: boolean;
  agreementName: string;
  agreementFiles: File[];
  chapter: string;
  localUnion: string;
  agreementType: string;
  states: string;
  effectiveFrom: string;
  effectiveTo: string;
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
  onEffectiveFromChange: (value: string) => void;
  onEffectiveToChange: (value: string) => void;
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

export default function UploadAgreementModal({
  isOpen,
  isUploading,
  isExtracting,
  agreementName,
  agreementFiles,
  chapter,
  localUnion,
  agreementType,
  states,
  effectiveFrom,
  effectiveTo,
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
  onEffectiveFromChange,
  onEffectiveToChange,
  onShareToNationalDatabaseChange,
  onSetDragActive,
  onHandleDroppedFiles,
  onUpload,
}: UploadAgreementModalProps) {
  if (!isOpen) return null;

  const progressPercent = getUploadProgressPercent(uploadStatus);
  const busy = isUploading || isExtracting;

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
              All fields are required. Upload a single agreement file — metadata
              will be extracted automatically.
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={busy}
            style={{
              ...styles.subtleBtn,
              ...(busy ? styles.btnDisabled : null),
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
              Drag and drop an agreement file here {requiredMark}
            </div>
            <div style={{ color: "var(--muted)" }}>
              Supports PDF, DOC, DOCX, and TXT — one file at a time
            </div>

            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) => onHandleDroppedFiles(e.target.files)}
            />

            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={styles.btn}
                disabled={busy}
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
                  Selected file
                </div>
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "#fff",
                    border: "1px solid var(--border)",
                    fontSize: 14,
                  }}
                >
                  {agreementFiles[0].name}
                </div>
              </div>
            )}
          </div>

          {isExtracting && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(37, 99, 235, 0.06)",
                border: "1px solid rgba(37, 99, 235, 0.16)",
                color: "var(--muted-strong)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Analyzing agreement and extracting metadata…
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              opacity: isExtracting ? 0.5 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            <div>
              <label style={labelStyle}>
                Agreement Name {requiredMark}
              </label>
              <input
                value={agreementName}
                onChange={(e) => onAgreementNameChange(e.target.value)}
                style={styles.input}
                placeholder="e.g. IBEW Local 702 CBA"
                disabled={isExtracting}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Chapter {requiredMark}
              </label>
              <input
                value={chapter}
                onChange={(e) => onChapterChange(e.target.value)}
                style={styles.input}
                disabled={isExtracting}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Local Union(s) {requiredMark}
              </label>
              <input
                value={localUnion}
                onChange={(e) => onLocalUnionChange(e.target.value)}
                style={styles.input}
                placeholder="e.g. 702 or 702, 461"
                disabled={isExtracting}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Agreement Type {requiredMark}
              </label>
              <input
                value={agreementType}
                onChange={(e) => onAgreementTypeChange(e.target.value)}
                style={styles.input}
                disabled={isExtracting}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Effective From {requiredMark}
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => onEffectiveFromChange(e.target.value)}
                style={styles.input}
                disabled={isExtracting}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Effective To {requiredMark}
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => onEffectiveToChange(e.target.value)}
                style={styles.input}
                disabled={isExtracting}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>
                State(s) {requiredMark}
              </label>
              <input
                value={states}
                onChange={(e) => onStatesChange(e.target.value)}
                style={styles.input}
                placeholder="e.g. LA or LA, MS"
                disabled={isExtracting}
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
                  disabled={isExtracting}
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
                If selected, this agreement can be searched by all authorized
                users in the system. Otherwise, it will remain limited to its
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
            disabled={busy}
            style={{
              ...styles.btn,
              ...(busy ? styles.btnDisabled : null),
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onUpload}
            disabled={busy}
            style={{
              ...styles.primaryBtn,
              ...(busy ? styles.btnDisabled : null),
            }}
          >
            {isUploading ? "Uploading…" : isExtracting ? "Analyzing…" : "Upload Agreement"}
          </button>
        </div>
      </div>
    </div>
  );
}
