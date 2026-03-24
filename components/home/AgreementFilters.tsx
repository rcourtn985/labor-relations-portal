"use client";

import MultiSelectDropdown from "./MultiSelectDropdown";
import { ChatScopeFilters, FilterOptionsResponse, UserRole } from "./types";

type AgreementFiltersProps = {
  filters: ChatScopeFilters;
  setFilters: React.Dispatch<React.SetStateAction<ChatScopeFilters>>;
  filterOptions: FilterOptionsResponse;
  filterOptionsLoading: boolean;
  filterOptionsError: string | null;
  currentUserRole: UserRole;
};

export default function AgreementFilters({
  filters,
  setFilters,
  filterOptions,
  filterOptionsLoading,
  filterOptionsError,
  currentUserRole,
}: AgreementFiltersProps) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 20,
        marginTop: 18,
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--panel)",
        boxShadow: "var(--shadow-soft)",
        overflow: "visible",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--panel-strong)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted-strong)",
              marginBottom: 4,
            }}
          >
            Agreement Scope
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Narrow the agreements included in search and chat results.
          </div>
        </div>

        <div
          style={{
            color: "var(--muted-strong)",
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Role: {currentUserRole}
        </div>
      </div>

      <div
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <MultiSelectDropdown
          label="Chapter"
          options={filterOptions.chapterOptions}
          selectedValues={filters.chapters}
          onChange={(nextValues) =>
            setFilters((current) => ({
              ...current,
              chapters: nextValues,
              localUnions: [],
              states: [],
            }))
          }
          allLabel="All Chapters"
          compactCountLabel="chapters selected"
          disabled={filterOptionsLoading}
        />

        <MultiSelectDropdown
          label="Local Union"
          options={filterOptions.localUnionOptions}
          selectedValues={filters.localUnions}
          onChange={(nextValues) =>
            setFilters((current) => ({
              ...current,
              localUnions: nextValues,
            }))
          }
          allLabel="All Local Unions"
          compactCountLabel="locals selected"
          disabled={filterOptionsLoading}
        />

        <MultiSelectDropdown
          label="Agreement Type"
          options={filterOptions.agreementTypeOptions}
          selectedValues={filters.agreementTypes}
          onChange={(nextValues) =>
            setFilters((current) => ({
              ...current,
              agreementTypes: nextValues,
            }))
          }
          allLabel="All Agreement Types"
          compactCountLabel="types selected"
          disabled={filterOptionsLoading}
        />

        <MultiSelectDropdown
          label="State(s)"
          options={filterOptions.stateOptions}
          selectedValues={filters.states}
          onChange={(nextValues) =>
            setFilters((current) => ({
              ...current,
              states: nextValues,
            }))
          }
          allLabel="All States"
          compactCountLabel="states selected"
          disabled={filterOptionsLoading}
        />
      </div>

      {filterOptionsError && (
        <div
          style={{
            margin: "0 16px 16px",
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid rgba(169, 68, 68, 0.22)",
            background: "rgba(169, 68, 68, 0.06)",
            color: "var(--foreground)",
            fontSize: 13,
          }}
        >
          Could not load filter options: {filterOptionsError}
        </div>
      )}
    </div>
  );
}