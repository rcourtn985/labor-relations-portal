"use client";

type ActiveScopeBarProps = {
  activeChapterSummary: string;
  activeLocalUnionSummary: string;
  activeAgreementTypeSummary: string;
  activeStateSummary: string;
  includeNationalAgreements: boolean;
};

export default function ActiveScopeBar({
  activeChapterSummary,
  activeLocalUnionSummary,
  activeAgreementTypeSummary,
  activeStateSummary,
  includeNationalAgreements,
}: ActiveScopeBarProps) {
  return (
    <div
      style={{
        marginTop: 14,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--panel)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--muted-strong)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Active Scope
      </span>

      <span
        style={{
          padding: "5px 9px",
          borderRadius: 999,
          background: "rgba(31, 58, 95, 0.08)",
          color: "var(--accent)",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        Chapters: {activeChapterSummary}
      </span>

      <span
        style={{
          padding: "5px 9px",
          borderRadius: 999,
          background: "rgba(31, 58, 95, 0.08)",
          color: "var(--accent)",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        Local Union: {activeLocalUnionSummary}
      </span>

      <span
        style={{
          padding: "5px 9px",
          borderRadius: 999,
          background: "rgba(31, 58, 95, 0.08)",
          color: "var(--accent)",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        Agreement Type: {activeAgreementTypeSummary}
      </span>

      <span
        style={{
          padding: "5px 9px",
          borderRadius: 999,
          background: "rgba(31, 58, 95, 0.08)",
          color: "var(--accent)",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        States: {activeStateSummary}
      </span>

      {includeNationalAgreements && (
        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            background: "rgba(47, 111, 126, 0.10)",
            color: "var(--accent-2)",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          National Included
        </span>
      )}
    </div>
  );
}