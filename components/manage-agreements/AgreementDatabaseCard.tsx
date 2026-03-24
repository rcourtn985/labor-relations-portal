"use client";

import { manageAgreementsStyles as styles } from "./styles";
import { AgreementRow, KBEntry, KBFilesResponse } from "./types";

type AgreementDatabaseCardProps = {
  selectedCollectionId: string;
  selectedCollectionName: string;
  agreementCollections: KBEntry[];
  filesLoading: boolean;
  loadingCollections: boolean;
  filesData: KBFilesResponse | null;
  agreementRows: AgreementRow[];
  onSelectedCollectionChange: (value: string) => void;
  onLoadFiles: () => void;
  onRefreshCollections: () => void;
  onOpenUploadedFile: (row: AgreementRow) => void;
  onOpenEditModal: (row: AgreementRow) => void;
};

export default function AgreementDatabaseCard({
  selectedCollectionId,
  selectedCollectionName,
  agreementCollections,
  filesLoading,
  loadingCollections,
  filesData,
  agreementRows,
  onSelectedCollectionChange,
  onLoadFiles,
  onRefreshCollections,
  onOpenUploadedFile,
  onOpenEditModal,
}: AgreementDatabaseCardProps) {
  return (
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
            onChange={(e) => onSelectedCollectionChange(e.target.value)}
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
            onClick={onLoadFiles}
            disabled={!selectedCollectionId || filesLoading}
            style={{
              ...styles.btn,
              ...((!selectedCollectionId || filesLoading) ? styles.btnDisabled : null),
            }}
          >
            {filesLoading ? "Loading…" : "Load"}
          </button>

          <button
            onClick={onRefreshCollections}
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
                      onClick={() => onOpenUploadedFile(row)}
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
                      onClick={() => onOpenEditModal(row)}
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
  );
}