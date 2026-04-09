"use client";

import React from "react";
import SearchableChapterSelect, {
  ChapterOption,
} from "./SearchableChapterSelect";
import { manageAgreementsStyles as styles } from "./styles";
import { getEditProgressPercent } from "./manageAgreementsPageUtils";

type EditAgreementModalProps = {
  isOpen: boolean;
  isSavingEdit: boolean;
  isDeletingAgreement?: boolean;
  editAgreementName: string;
  editChapter: string;
  editLocalUnion: string;
  editAgreementType: string;
  editStates: string;
  editEffectiveFrom: string;
  editEffectiveTo: string;
  editShareToNationalDatabase: boolean;
  editError: string | null;
  editStatus: string | null;
  chapterOptions: ChapterOption[];
  chapterLocked: boolean;
  publicChaptersLoading: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  onEditAgreementNameChange: (value: string) => void;
  onEditChapterChange: (value: string) => void;
  onEditLocalUnionChange: (value: string) => void;
  onEditAgreementTypeChange: (value: string) => void;
  onEditStatesChange: (value: string) => void;
  onEditEffectiveFromChange: (value: string) => void;
  onEditEffectiveToChange: (value: string) => void;
  onEditShareToNationalDatabaseChange: (checked: boolean) => void;
};

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

export default function EditAgreementModal({
  isOpen,
  isSavingEdit,
  isDeletingAgreement = false,
  editAgreementName,
  editChapter,
  editLocalUnion,
  editAgreementType,
  editStates,
  editEffectiveFrom,
  editEffectiveTo,
  editShareToNationalDatabase,
  editError,
  editStatus,
  chapterOptions,
  chapterLocked,
  publicChaptersLoading,
  onClose,
  onSave,
  onDelete,
  onEditAgreementNameChange,
  onEditChapterChange,
  onEditLocalUnionChange,
  onEditAgreementTypeChange,
  onEditStatesChange,
  onEditEffectiveFromChange,
  onEditEffectiveToChange,
  onEditShareToNationalDatabaseChange,
}: EditAgreementModalProps) {
  if (!isOpen) return null;

  const isBusy = isSavingEdit || isDeletingAgreement;

  return (
    <div style={styles.modalOverlay} onClick={isBusy ? undefined : onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.sectionTitle}>Edit Agreement</div>
            <div style={styles.sectionSubtext}>
              All fields are required. Update the stored metadata for this agreement.
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isBusy}
            style={{
              ...styles.subtleBtn,
              ...(isBusy ? styles.btnDisabled : null),
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
                onChange={(e) => onEditAgreementNameChange(e.target.value)}
                disabled={isBusy}
                style={styles.input}
              />
            </div>

            <SearchableChapterSelect
              label="Chapter"
              required
              value={editChapter}
              options={chapterOptions}
              locked={chapterLocked}
              disabled={isBusy || publicChaptersLoading}
              placeholder="Start typing a chapter name"
              onChange={onEditChapterChange}
            />

            <div>
              <label style={labelStyle}>Local Union(s) {requiredMark}</label>
              <input
                type="text"
                value={editLocalUnion}
                onChange={(e) => onEditLocalUnionChange(e.target.value)}
                disabled={isBusy}
                style={styles.input}
              />
            </div>

            <div>
              <label style={labelStyle}>Agreement Type {requiredMark}</label>
              <input
                type="text"
                value={editAgreementType}
                onChange={(e) => onEditAgreementTypeChange(e.target.value)}
                disabled={isBusy}
                style={styles.input}
              />
            </div>

            <div>
              <label style={labelStyle}>Effective From {requiredMark}</label>
              <input
                type="date"
                value={editEffectiveFrom}
                onChange={(e) => onEditEffectiveFromChange(e.target.value)}
                disabled={isBusy}
                style={styles.input}
              />
            </div>

            <div>
              <label style={labelStyle}>Effective To {requiredMark}</label>
              <input
                type="date"
                value={editEffectiveTo}
                onChange={(e) => onEditEffectiveToChange(e.target.value)}
                disabled={isBusy}
                style={styles.input}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>State(s) {requiredMark}</label>
              <input
                type="text"
                value={editStates}
                onChange={(e) => onEditStatesChange(e.target.value)}
                disabled={isBusy}
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
                  disabled={isBusy}
                  onChange={(e) =>
                    onEditShareToNationalDatabaseChange(e.target.checked)
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

        <div
          style={{
            ...styles.modalFooter,
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={isBusy}
                style={{
                  ...styles.btn,
                  ...(isBusy ? styles.btnDisabled : null),
                  color: isBusy ? undefined : "#991b1b",
                  borderColor: isBusy ? undefined : "rgba(185,28,28,0.25)",
                }}
              >
                {isDeletingAgreement ? "Deleting…" : "Delete Agreement"}
              </button>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              style={{
                ...styles.btn,
                ...(isBusy ? styles.btnDisabled : null),
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={isBusy}
              style={{
                ...styles.primaryBtn,
                ...(isBusy ? styles.btnDisabled : null),
              }}
            >
              {isSavingEdit ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}