"use client";

import { ChatScopeFilters } from "./types";

type HomeHeroProps = {
  filters: ChatScopeFilters;
  setFilters: React.Dispatch<React.SetStateAction<ChatScopeFilters>>;
  canManageAgreements: boolean;
};

export default function HomeHero({
  filters,
  setFilters,
  canManageAgreements,
}: HomeHeroProps) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(31, 58, 95, 0.12)",
        background:
          "linear-gradient(135deg, rgba(31, 58, 95, 0.98) 0%, rgba(38, 72, 111, 0.98) 100%)",
        color: "#fff",
        padding: "24px 24px 22px",
        boxShadow: "var(--shadow-strong)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.78,
              marginBottom: 10,
            }}
          >
            Labor Relations Platform
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 34,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Labor Relations Central Intelligence
          </h1>

          <div
            style={{
              marginTop: 12,
              color: "rgba(255,255,255,0.84)",
              fontSize: 15,
              lineHeight: 1.6,
              maxWidth: 760,
            }}
          >
            Search and chat across collective bargaining agreements using structured
            agreement filters and shared contract intelligence.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={filters.includeNationalAgreements}
              onChange={(e) =>
                setFilters((current) => ({
                  ...current,
                  includeNationalAgreements: e.target.checked,
                }))
              }
            />
            <span>National Database</span>
          </label>

          {canManageAgreements && (
            <a
              href="/kb"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "11px 15px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "#ffffff",
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 700,
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              }}
            >
              Manage Agreements
            </a>
          )}
        </div>
      </div>
    </div>
  );
}