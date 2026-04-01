"use client";

import dynamic from "next/dynamic";
import { manageAgreementsStyles as styles } from "./styles";
import { AgreementPreviewResponse } from "./manageAgreementsPageUtils";

const AgreementPdfViewer = dynamic(() => import("./AgreementPdfViewer"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 18, color: "var(--muted-strong)", fontWeight: 700 }}>
      Loading PDF viewer…
    </div>
  ),
});

type AgreementPreviewPanelProps = {
  previewLoading: boolean;
  previewError: string | null;
  previewData: AgreementPreviewResponse | null;
  previewInitialSearchQuery: string;
  onClose: () => void;
};

export default function AgreementPreviewPanel({
  previewLoading,
  previewError,
  previewData,
  previewInitialSearchQuery,
  onClose,
}: AgreementPreviewPanelProps) {
  return (
    <div
      style={{
        minWidth: 0,
        position: "sticky",
        top: 16,
        alignSelf: "start",
      }}
    >
      <div
        style={{
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto minmax(78vh, calc(100vh - 180px))",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--border)",
            background:
              "linear-gradient(180deg, rgba(148,163,184,0.06), rgba(148,163,184,0.02))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--foreground)",
                lineHeight: 1.2,
              }}
              title={previewData?.agreementName || ""}
            >
              {previewData?.agreementName || "Loading agreement..."}
            </div>

            {previewData?.filename && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 220,
                }}
                title={previewData.filename}
              >
                {previewData.filename}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            {previewData?.fileUrl && (
              <>
                <a
                  href={previewData.fileUrl}
                  download={previewData.filename || undefined}
                  style={styles.primaryBtn}
                >
                  Download
                </a>
                <a
                  href={previewData.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.subtleBtn}
                >
                  Open in New Tab
                </a>
              </>
            )}
            <button type="button" onClick={onClose} style={styles.subtleBtn}>
              Close
            </button>
          </div>
        </div>

        <div style={{ minHeight: 0, background: "#fff", display: "grid" }}>
          {previewLoading && (
            <div
              style={{
                padding: 18,
                color: "var(--muted-strong)",
                fontWeight: 700,
              }}
            >
              Loading agreement preview…
            </div>
          )}

          {previewError && (
            <div style={{ padding: 18 }}>
              <div style={styles.errorBox}>
                <b>Preview error:</b> {previewError}
              </div>
            </div>
          )}

          {!previewLoading && !previewError && previewData?.fileUrl ? (
            previewData.canPreviewInline ? (
              previewData.mimeType === "application/pdf" ? (
                <AgreementPdfViewer
                  fileUrl={previewData.fileUrl}
                  searchQuery={previewInitialSearchQuery}
                />
              ) : (
                <iframe
                  title={previewData.filename || "Agreement preview"}
                  src={previewData.fileUrl}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    background: "#fff",
                  }}
                />
              )
            ) : (
              <div
                style={{
                  padding: 24,
                  display: "grid",
                  gap: 12,
                  alignContent: "start",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 18,
                    color: "var(--foreground)",
                  }}
                >
                  Inline preview is not available for this file type.
                </div>
                <div style={{ color: "var(--muted)" }}>
                  Use the buttons above to download the agreement or open it in a
                  new tab.
                </div>
              </div>
            )
          ) : !previewLoading && !previewError ? (
            <div style={{ padding: 24, color: "var(--muted)" }}>
              No preview is available for this agreement.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}