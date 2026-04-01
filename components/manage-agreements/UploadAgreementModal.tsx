"use client";

import React, { useState, useEffect } from "react";
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
  chapterOptions: string[];
  chapterLocked: boolean;
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

function SmoothProgressBar({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  return (
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
          {label}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
          {Math.round(percent)}%
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
            width: `${percent}%`,
            height: "100%",
            borderRadius: 999,
            background: "var(--brand-gradient)",
            transition: "width 480ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
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
  chapterOptions,
  chapterLocked,
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
  const [smoothUploadPercent, setSmoothUploadPercent] = useState(0);
  const [smoothExtractPercent, setSmoothExtractPercent] = useState(0);

  useEffect(() => {
    if (!isUploading) {
      setSmoothUploadPercent(0);
      return;
    }
    setSmoothUploadPercent(3);
    const interval = window.setInterval(() => {
      setSmoothUploadPercent((prev) => Math.min(prev + (88 - prev) * 0.055, 88));
    }, 600);
    return () => window.clearInterval(interval);
  }, [isUploading]);

  useEffect(() => {
    if (isExtracting) {
      setSmoothExtractPercent(3);
      const interval = window.setInterval(() => {
        setSmoothExtractPercent((prev) => Math.min(prev + (82 - prev) * 0.07, 82));
      }, 500);
      return () => window.clearInterval(interval);
    } else {
      setSmoothExtractPercent((prev) => (prev > 0 ? 100 : 0));
      const t = window.setTimeout(() => setSmoothExtractPercent(0), 700);
      return () => window.clearTimeout(t);
    }
  }, [isExtracting]);

  if (!isOpen) return null;

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
              {chapterLocked ? (
                <input value={chapter} style={styles.input} disabled />
              ) : (
                <>
                  <input
                    list="chapter-options"
                    value={chapter}
                    onChange={(e) => onChapterChange(e.target.value)}
                    style={styles.input}
                    placeholder="e.g. Southern Chapter"
                    disabled={isExtracting}
                  />
                  <datalist id="chapter-options">
                    {chapterOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </>
              )}
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

          {(isExtracting || smoothExtractPercent > 0) && (
            <SmoothProgressBar
              percent={smoothExtractPercent}
              label="Analyzing agreement and extracting metadata…"
            />
          )}

          {(isUploading || smoothUploadPercent > 0) && (
            <SmoothProgressBar
              percent={smoothUploadPercent}
              label={uploadStatus ?? "Uploading…"}
            />
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