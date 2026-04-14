"use client";

import { useEffect, useState } from "react";

type CanonicalHealthResponse = {
  summary: {
    cbaDocumentCount: number;
    agreementCount: number;
    orphanCbaDocumentCount: number;
    agreementsWithNoDocumentsCount: number;
    agreementsWithMultipleDocumentsCount: number;
    sharedCopyMismatchCount: number;
    mixedMetadataAgreementCount: number;
  };
  orphans: Array<{
    id: string;
    filename: string;
    chapter: string | null;
    localUnion: string | null;
    cbaType: string | null;
    state: string | null;
    kbId: string;
    createdAt: string;
    sharedToCbas: boolean;
  }>;
  agreementsWithNoDocuments: Array<{
    agreementId: string;
    agreementName: string;
    sourceFilename: string;
  }>;
  agreementsWithMultipleDocuments: Array<{
    agreementId: string;
    agreementName: string;
    documentCount: number;
    filenames: string[];
  }>;
  sharedCopyMismatches: Array<{
    agreementId: string;
    agreementName: string;
    filename: string;
    chapterCopyCount: number;
    sharedCopyCount: number;
  }>;
  mixedMetadataAgreements: Array<{
    agreementId: string;
    agreementName: string;
    chapterValues: string[];
    localUnionValues: string[];
    agreementTypeValues: string[];
    stateValues: string[];
  }>;
};

type Props = {
  refreshVersion: number;
};

function cardStyle() {
  return {
    border: "1px solid var(--border)",
    borderRadius: 20,
    background: "var(--panel)",
    boxShadow: "var(--shadow-soft)",
    padding: 24,
  } as const;
}

function sectionTitleStyle() {
  return {
    margin: 0,
    marginBottom: 8,
    fontSize: 22,
  } as const;
}

function mutedStyle() {
  return {
    margin: 0,
    color: "var(--muted)",
  } as const;
}

function metricCardStyle() {
  return {
    border: "1px solid var(--border)",
    borderRadius: 16,
    background: "var(--panel-soft)",
    padding: 14,
    display: "grid",
    gap: 4,
  } as const;
}

function labelStyle() {
  return {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color: "var(--muted-strong)",
  };
}

function valueStyle() {
  return {
    fontSize: 26,
    fontWeight: 800,
    color: "var(--foreground)",
    lineHeight: 1.1,
  };
}

function issueBoxStyle() {
  return {
    border: "1px solid var(--border)",
    borderRadius: 14,
    background: "white",
    padding: 14,
    display: "grid",
    gap: 10,
  } as const;
}

export default function CanonicalAgreementHealthCard({ refreshVersion }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CanonicalHealthResponse | null>(null);

  async function loadHealth() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/canonical-health", {
        cache: "no-store",
      });
      const payload = (await res.json()) as CanonicalHealthResponse & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to load canonical agreement health.");
      }

      setData(payload);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load canonical agreement health.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, [refreshVersion]);

  const summary = data?.summary;

  return (
    <div style={cardStyle()}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 18,
        }}
      >
        <div>
          <h2 style={sectionTitleStyle()}>Canonical Agreement Health</h2>
          <p style={mutedStyle()}>
            Quick system-admin visibility into orphaned rows, shared-copy mismatches,
            and canonical agreement integrity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadHealth()}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "10px 14px",
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Health Check"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(169, 68, 68, 0.25)",
            background: "rgba(169, 68, 68, 0.08)",
            color: "var(--danger)",
            padding: "12px 14px",
            marginBottom: 18,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={metricCardStyle()}>
          <div style={labelStyle()}>CBA Documents</div>
          <div style={valueStyle()}>{summary?.cbaDocumentCount ?? "—"}</div>
        </div>
        <div style={metricCardStyle()}>
          <div style={labelStyle()}>Canonical Agreements</div>
          <div style={valueStyle()}>{summary?.agreementCount ?? "—"}</div>
        </div>
        <div style={metricCardStyle()}>
          <div style={labelStyle()}>Orphan Documents</div>
          <div style={valueStyle()}>{summary?.orphanCbaDocumentCount ?? "—"}</div>
        </div>
        <div style={metricCardStyle()}>
          <div style={labelStyle()}>No-Document Agreements</div>
          <div style={valueStyle()}>
            {summary?.agreementsWithNoDocumentsCount ?? "—"}
          </div>
        </div>
        <div style={metricCardStyle()}>
          <div style={labelStyle()}>Multi-Document Agreements</div>
          <div style={valueStyle()}>
            {summary?.agreementsWithMultipleDocumentsCount ?? "—"}
          </div>
        </div>
        <div style={metricCardStyle()}>
          <div style={labelStyle()}>Shared Copy Mismatches</div>
          <div style={valueStyle()}>
            {summary?.sharedCopyMismatchCount ?? "—"}
          </div>
        </div>
        <div style={metricCardStyle()}>
          <div style={labelStyle()}>Mixed Metadata</div>
          <div style={valueStyle()}>
            {summary?.mixedMetadataAgreementCount ?? "—"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={issueBoxStyle()}>
          <div style={{ fontWeight: 800 }}>Orphan CBA Documents</div>
          {data?.orphans?.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {data.orphans.slice(0, 10).map((row) => (
                <div key={row.id} style={{ fontSize: 14 }}>
                  <strong>{row.filename}</strong> — {row.chapter ?? "—"} /{" "}
                  {row.state ?? "—"} / {row.kbId}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--muted)" }}>No orphan CBA documents found.</div>
          )}
        </div>

        <div style={issueBoxStyle()}>
          <div style={{ fontWeight: 800 }}>Shared Copy Mismatches</div>
          {data?.sharedCopyMismatches?.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {data.sharedCopyMismatches.slice(0, 10).map((row) => (
                <div key={row.agreementId} style={{ fontSize: 14 }}>
                  <strong>{row.agreementName}</strong> — chapter copies:{" "}
                  {row.chapterCopyCount}, shared copies: {row.sharedCopyCount}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--muted)" }}>
              No shared-copy mismatches detected.
            </div>
          )}
        </div>

        <div style={issueBoxStyle()}>
          <div style={{ fontWeight: 800 }}>Mixed Metadata Across Linked Documents</div>
          {data?.mixedMetadataAgreements?.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {data.mixedMetadataAgreements.slice(0, 10).map((row) => (
                <div key={row.agreementId} style={{ fontSize: 14 }}>
                  <strong>{row.agreementName}</strong>
                  <div style={{ color: "var(--muted-strong)", marginTop: 4 }}>
                    Chapters: {row.chapterValues.join(" | ") || "—"}
                  </div>
                  <div style={{ color: "var(--muted-strong)" }}>
                    Locals: {row.localUnionValues.join(" | ") || "—"}
                  </div>
                  <div style={{ color: "var(--muted-strong)" }}>
                    Types: {row.agreementTypeValues.join(" | ") || "—"}
                  </div>
                  <div style={{ color: "var(--muted-strong)" }}>
                    States: {row.stateValues.join(" | ") || "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--muted)" }}>
              No mixed metadata issues detected across linked documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}