"use client";

import { manageAgreementsStyles as styles } from "./styles";

type ManageAgreementsHeroProps = {
  onOpenUploadModal: () => void;
  canManageAgreements?: boolean;
};

export default function ManageAgreementsHero({
  onOpenUploadModal,
  canManageAgreements = true,
}: ManageAgreementsHeroProps) {
  return (
    <div style={styles.hero}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 860 }}>
          <div style={styles.heroLabel}>Agreement Administration</div>
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            Agreement Database
          </h1>
          <div style={styles.heroSubtext}>
            Upload, search, and manage collective bargaining agreements. Filter
            by status, chapter, local union, state, and effective dates.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {canManageAgreements ? (
            <button onClick={onOpenUploadModal} style={styles.primaryBtn}>
              Upload Agreement
            </button>
          ) : null}

          <a href="/chat" style={{ textDecoration: "none" }}>
            <button
              style={{
                ...styles.btn,
                background: "rgba(255,255,255,0.10)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "none",
              }}
            >
              Chat
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}