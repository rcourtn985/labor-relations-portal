"use client";

import MultiSelectDropdown from "../home/MultiSelectDropdown";
import { manageAgreementsStyles as styles } from "./styles";
import { AgreementRow } from "./types";

type FilterOption = {
  value: string;
  label: string;
};

type AgreementDatabaseCardProps = {
  filesLoading: boolean;
  searchLoading: boolean;
  searchError: string | null;
  agreementRows: AgreementRow[];
  filteredAgreementRows: AgreementRow[];
  agreementNameQuery: string;
  contentSearchQuery: string;
  chapterOptions: FilterOption[];
  localUnionOptions: FilterOption[];
  agreementTypeOptions: FilterOption[];
  stateOptions: FilterOption[];
  selectedChapters: string[];
  selectedLocalUnions: string[];
  selectedAgreementTypes: string[];
  selectedStates: string[];
  nationalDatabaseFilter: "all" | "shared";
  showExpired: boolean;
  hideContentSearch?: boolean;
  onAgreementNameQueryChange: (value: string) => void;
  onContentSearchQueryChange: (value: string) => void;
  onSelectedChaptersChange: (value: string[]) => void;
  onSelectedLocalUnionsChange: (value: string[]) => void;
  onSelectedAgreementTypesChange: (value: string[]) => void;
  onSelectedStatesChange: (value: string[]) => void;
  onNationalDatabaseFilterChange: (value: "all" | "shared") => void;
  onShowExpiredChange: (value: boolean) => void;
  onClearFilters: () => void;
  onRefreshAgreements: () => void;
  onOpenUploadedFile: (row: AgreementRow) => void;
  onOpenEditModal: (row: AgreementRow) => void;
  onDeleteAgreement: (row: AgreementRow) => void;
  isDeletingAgreementId: string | null;
  canManageAgreements?: boolean;
  canManageAgreement?: (row: AgreementRow) => boolean;
};

type AgreementStatus = "active" | "expired" | "upcoming";

function getAgreementStatus(row: AgreementRow): AgreementStatus | null {
  if (!row.effectiveFrom && !row.effectiveTo) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const fromStr = row.effectiveFrom?.slice(0, 10) ?? null;
  const toStr = row.effectiveTo?.slice(0, 10) ?? null;

  if (fromStr && fromStr > todayStr) return "upcoming";
  if (toStr && toStr < todayStr) return "expired";
  return "active";
}

function formatDateShort(isoString: string | null): string {
  if (!isoString) return "—";
  const [year, month, day] = isoString.slice(0, 10).split("-");
  return `${month}/${day}/${year}`;
}

function nationalBadgeStyle(sharedToCbas: boolean) {
  return {
    ...styles.badge,
    background: sharedToCbas
      ? "rgba(24, 124, 84, 0.12)"
      : "rgba(99, 115, 129, 0.12)",
    border: sharedToCbas
      ? "1px solid rgba(24, 124, 84, 0.28)"
      : "1px solid rgba(99, 115, 129, 0.22)",
    color: sharedToCbas ? "#136a49" : "var(--muted-strong)",
  };
}

function statusBadgeStyle(status: AgreementStatus) {
  if (status === "active") {
    return {
      ...styles.badge,
      background: "rgba(24, 124, 84, 0.12)",
      border: "1px solid rgba(24, 124, 84, 0.28)",
      color: "#136a49",
    };
  }
  if (status === "upcoming") {
    return {
      ...styles.badge,
      background: "rgba(37, 99, 235, 0.10)",
      border: "1px solid rgba(37, 99, 235, 0.20)",
      color: "#1e40af",
    };
  }
  return {
    ...styles.badge,
    background: "rgba(185, 28, 28, 0.10)",
    border: "1px solid rgba(185, 28, 28, 0.20)",
    color: "#991b1b",
  };
}

function statusLabel(status: AgreementStatus): string {
  if (status === "active") return "Active";
  if (status === "upcoming") return "Upcoming";
  return "Expired";
}

export default function AgreementDatabaseCard({
  filesLoading,
  searchLoading,
  searchError,
  agreementRows,
  filteredAgreementRows,
  agreementNameQuery,
  contentSearchQuery,
  chapterOptions,
  localUnionOptions,
  agreementTypeOptions,
  stateOptions,
  selectedChapters,
  selectedLocalUnions,
  selectedAgreementTypes,
  selectedStates,
  nationalDatabaseFilter,
  showExpired,
  hideContentSearch,
  onAgreementNameQueryChange,
  onContentSearchQueryChange,
  onSelectedChaptersChange,
  onSelectedLocalUnionsChange,
  onSelectedAgreementTypesChange,
  onSelectedStatesChange,
  onNationalDatabaseFilterChange,
  onShowExpiredChange,
  onClearFilters,
  onRefreshAgreements,
  onOpenUploadedFile,
  onOpenEditModal,
  onDeleteAgreement,
  isDeletingAgreementId,
  canManageAgreements = true,
  canManageAgreement,
}: AgreementDatabaseCardProps) {
  const showActionsColumn =
    canManageAgreements || filteredAgreementRows.some((row) => Boolean(row.fileUrl));

  return (
    <div
      style={{
        ...styles.card,
        overflow: "visible",
        position: "relative",
        zIndex: 1,
      }}
    >
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
              Review uploaded agreements, filter the full agreement set, search
              agreement text, and update stored agreement metadata.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={styles.toolbarChip}>
              All Agreements: {agreementRows.length}
            </span>
            <span style={styles.toolbarChip}>
              Filtered: {filteredAgreementRows.length}
            </span>

            <button
              type="button"
              onClick={onRefreshAgreements}
              style={styles.subtleBtn}
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={onClearFilters}
              style={styles.subtleBtn}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          ...styles.cardBody,
          overflow: "visible",
          position: "relative",
          zIndex: 30,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
            alignItems: "start",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--muted-strong)",
                marginBottom: 6,
              }}
            >
              Agreement Name
            </div>
            <input
              type="text"
              value={agreementNameQuery}
              onChange={(e) => onAgreementNameQueryChange(e.target.value)}
              placeholder="Search agreement name..."
              style={styles.input}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <MultiSelectDropdown
              label="Chapter"
              options={chapterOptions}
              selectedValues={selectedChapters}
              onChange={onSelectedChaptersChange}
              allLabel="All Chapters"
              compactCountLabel="chapters selected"
              disabled={filesLoading}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <MultiSelectDropdown
              label="Local Union(s)"
              options={localUnionOptions}
              selectedValues={selectedLocalUnions}
              onChange={onSelectedLocalUnionsChange}
              allLabel="All Local Unions"
              compactCountLabel="locals selected"
              disabled={filesLoading}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <MultiSelectDropdown
              label="Agreement Type"
              options={agreementTypeOptions}
              selectedValues={selectedAgreementTypes}
              onChange={onSelectedAgreementTypesChange}
              allLabel="All Agreement Types"
              compactCountLabel="types selected"
              disabled={filesLoading}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <MultiSelectDropdown
              label="States"
              options={stateOptions}
              selectedValues={selectedStates}
              onChange={onSelectedStatesChange}
              allLabel="All States"
              compactCountLabel="states selected"
              disabled={filesLoading}
            />
          </div>

          <div style={{ minWidth: 180 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--muted-strong)",
                marginBottom: 6,
              }}
            >
              National Database
            </div>
            <select
              value={nationalDatabaseFilter}
              onChange={(e) =>
                onNationalDatabaseFilterChange(
                  e.target.value as "all" | "shared"
                )
              }
              style={{ ...styles.select, minWidth: 180, width: "100%" }}
            >
              <option value="all">All</option>
              <option value="shared">Shared</option>
            </select>
          </div>
        </div>

        {!hideContentSearch && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--muted-strong)",
                marginBottom: 6,
              }}
            >
              Agreement Content Search
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={contentSearchQuery}
                onChange={(e) => onContentSearchQueryChange(e.target.value)}
                placeholder='Find agreements containing a phrase, for example "hot stick"...'
                style={{
                  ...styles.input,
                  paddingRight: contentSearchQuery ? 32 : undefined,
                }}
              />
              {contentSearchQuery && (
                <button
                  type="button"
                  onClick={() => onContentSearchQueryChange("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    padding: "0 2px",
                    cursor: "pointer",
                    color: "var(--muted-strong)",
                    fontSize: 14,
                    lineHeight: 1,
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {(searchLoading || searchError || contentSearchQuery.trim()) && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: searchError ? "#8b2e2e" : "var(--muted-strong)",
                }}
              >
                {searchError
                  ? `Search error: ${searchError}`
                  : searchLoading
                    ? "Searching agreement text…"
                    : contentSearchQuery.trim()
                      ? "Showing agreements whose extracted text matches the current search."
                      : ""}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => onShowExpiredChange(e.target.checked)}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--muted-strong)",
              }}
            >
              Show Expired Agreements
            </span>
          </label>
        </div>
      </div>

      <div
        style={{
          ...styles.tableWrap,
          position: "relative",
          zIndex: 1,
          overflowX: "auto",
          overflowY: "visible",
        }}
      >
        {filesLoading && (
          <div style={{ padding: 16, color: "var(--muted)" }}>
            Loading agreements…
          </div>
        )}

        {!filesLoading && agreementRows.length === 0 && (
          <div style={{ padding: 16, color: "var(--muted)" }}>
            No agreements found yet.
          </div>
        )}

        {!filesLoading &&
          agreementRows.length > 0 &&
          filteredAgreementRows.length === 0 && (
            <div style={{ padding: 16, color: "var(--muted)" }}>
              No agreements match the current filters.{" "}
              {!showExpired && (
                <span>
                  Expired and undated agreements are hidden —{" "}
                  <button
                    type="button"
                    onClick={() => onShowExpiredChange(true)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--accent)",
                      textDecoration: "underline",
                      cursor: "pointer",
                      font: "inherit",
                      fontSize: "inherit",
                    }}
                  >
                    show all agreements
                  </button>
                  .
                </span>
              )}
            </div>
          )}

        {!filesLoading && filteredAgreementRows.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Agreement Name</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Effective Period</th>
                <th style={styles.th}>Chapter</th>
                <th style={styles.th}>Local Union(s)</th>
                <th style={styles.th}>Agreement Type</th>
                <th style={styles.th}>States</th>
                <th style={styles.th}>National Database</th>
                <th style={styles.th}>Uploaded</th>
                {showActionsColumn ? <th style={styles.th}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredAgreementRows.map((row) => {
                const agreementStatus = getAgreementStatus(row);
                const isDeleting = isDeletingAgreementId === row.id;
                const rowCanManage = canManageAgreement
                  ? canManageAgreement(row)
                  : canManageAgreements;

                return (
                  <tr key={row.id}>
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
                          textAlign: "left",
                        }}
                        title={`Open ${row.filename}`}
                      >
                        {row.agreementName}
                      </button>
                    </td>
                    <td style={styles.td}>
                      {agreementStatus ? (
                        <span style={statusBadgeStyle(agreementStatus)}>
                          {statusLabel(agreementStatus)}
                        </span>
                      ) : null}
                    </td>
                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      {row.effectiveFrom || row.effectiveTo
                        ? `${formatDateShort(row.effectiveFrom)} – ${formatDateShort(row.effectiveTo)}`
                        : "—"}
                    </td>
                    <td style={styles.td}>{row.chapter}</td>
                    <td style={styles.td}>{row.localUnion}</td>
                    <td style={styles.td}>{row.agreementType}</td>
                    <td style={styles.td}>{row.states}</td>
                    <td style={styles.td}>
                      <span style={nationalBadgeStyle(row.sharedToCbas)}>
                        {row.sharedToCbas ? "Shared" : "Not Shared"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {row.uploadedAt
                        ? new Date(row.uploadedAt * 1000).toLocaleString()
                        : ""}
                    </td>
                    {showActionsColumn ? (
                      <td style={styles.td}>
                        {rowCanManage ? (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(row)}
                              disabled={isDeleting}
                              style={{
                                ...styles.subtleBtn,
                                ...(isDeleting ? styles.btnDisabled : null),
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteAgreement(row)}
                              disabled={isDeleting}
                              style={{
                                ...styles.subtleBtn,
                                ...(isDeleting ? styles.btnDisabled : null),
                                color: isDeleting ? undefined : "#991b1b",
                                borderColor: isDeleting
                                  ? undefined
                                  : "rgba(185,28,28,0.25)",
                              }}
                            >
                              {isDeleting ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        ) : row.fileUrl ? (
                          <a
                            href={row.fileUrl}
                            download={row.filename || undefined}
                            style={styles.subtleBtn}
                            title={`Download ${row.filename}`}
                          >
                            Download
                          </a>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 13 }}>
                            Unavailable
                          </span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}