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
              onChange={(e) => onHandleDroppedFiles(e.target.files)}
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
                type="text"
                placeholder="Chapter"
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
                Local Union
              </label>
              <input
                type="text"
                placeholder="Local Union"
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
                type="text"
                placeholder="Agreement Type"
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
                type="text"
                placeholder="Example: LA or LA, MS"
                value={states}
                onChange={(e) => onStatesChange(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ marginTop: 16, ...styles.checkboxRow }}>
            <input
              id="shareToNationalDatabase"
              type="checkbox"
              checked={shareToNationalDatabase}
              onChange={(e) => onShareToNationalDatabaseChange(e.target.checked)}
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