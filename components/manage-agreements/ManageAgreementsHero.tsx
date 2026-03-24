"use client";

import { manageAgreementsStyles as styles } from "./styles";

type ManageAgreementsHeroProps = {
  onOpenUploadModal: () => void;
};

export default function ManageAgreementsHero({
  onOpenUploadModal,
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
            Manage Agreements
          </h1>
          <div style={styles.heroSubtext}>
            Upload, review, and update collective bargaining agreements in a
            structured administrative workspace designed for agreement operations.
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
          <button onClick={onOpenUploadModal} style={styles.primaryBtn}>
            Upload Agreement
          </button>

          <a href="/" style={{ textDecoration: "none" }}>
            <button
              style={{
                ...styles.btn,
                background: "rgba(255,255,255,0.10)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "none",
              }}
            >
              ← Back to Chat
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}