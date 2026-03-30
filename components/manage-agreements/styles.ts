import React from "react";

export const manageAgreementsStyles = {
  page: {
    maxWidth: 1800,
    margin: "0 auto",
    padding: "28px clamp(20px, 3vw, 56px) 24px",
    color: "var(--foreground)",
  } as React.CSSProperties,

  hero: {
    borderRadius: 14,
    border: "1px solid rgba(31, 58, 95, 0.12)",
    background:
      "linear-gradient(135deg, rgba(31, 58, 95, 0.98) 0%, rgba(38, 72, 111, 0.98) 100%)",
    color: "#fff",
    padding: "22px 24px",
    boxShadow: "var(--shadow-strong)",
  } as React.CSSProperties,

  heroLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.78,
    marginBottom: 10,
  } as React.CSSProperties,

  subtext: {
    color: "var(--muted)",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 1.5,
  } as React.CSSProperties,

  heroSubtext: {
    marginTop: 12,
    color: "rgba(255,255,255,0.84)",
    fontSize: 15,
    lineHeight: 1.6,
    maxWidth: 820,
  } as React.CSSProperties,

  card: {
    marginTop: 18,
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--panel)",
    boxShadow: "var(--shadow-soft)",
    overflow: "hidden",
  } as React.CSSProperties,

  cardHeader: {
    padding: "14px 16px",
    borderBottom: "1px solid var(--border)",
    background: "var(--panel-strong)",
  } as React.CSSProperties,

  cardBody: {
    padding: 16,
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--muted-strong)",
    marginBottom: 4,
  } as React.CSSProperties,

  sectionSubtext: {
    color: "var(--muted)",
    fontSize: 13,
    lineHeight: 1.5,
  } as React.CSSProperties,

  btn: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid var(--button-border)",
    background: "#ffffff",
    color: "var(--foreground)",
    cursor: "pointer",
    fontWeight: 700,
    letterSpacing: 0.1,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  } as React.CSSProperties,

  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #17314f",
    background: "var(--brand-gradient)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
    letterSpacing: 0.1,
    boxShadow: "var(--shadow-soft)",
  } as React.CSSProperties,

  subtleBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--panel-strong)",
    color: "var(--foreground)",
    cursor: "pointer",
    fontWeight: 600,
  } as React.CSSProperties,

  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "1px solid var(--input-border)",
    background: "var(--input-bg)",
    color: "var(--foreground)",
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties,

  select: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid var(--input-border)",
    background: "var(--input-bg)",
    color: "var(--foreground)",
    minWidth: 320,
    fontSize: 14,
  } as React.CSSProperties,

  checkboxRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontWeight: 700,
    flexWrap: "wrap",
  } as React.CSSProperties,

  errorBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    border: "1px solid rgba(169, 68, 68, 0.20)",
    background: "rgba(169, 68, 68, 0.06)",
    color: "var(--foreground)",
  } as React.CSSProperties,

  successBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    border: "1px solid rgba(43, 110, 82, 0.20)",
    background: "rgba(43, 110, 82, 0.06)",
    color: "var(--foreground)",
  } as React.CSSProperties,

  tableWrap: {
    overflowX: "auto",
    borderTop: "1px solid var(--border)",
    background: "#fff",
  } as React.CSSProperties,

  table: {
    width: "100%",
    minWidth: 1240,
    borderCollapse: "collapse",
    color: "var(--foreground)",
  } as React.CSSProperties,

  th: {
    textAlign: "left",
    borderBottom: "1px solid var(--border)",
    padding: "12px 12px",
    background: "var(--table-header)",
    color: "var(--muted-strong)",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
  } as React.CSSProperties,

  td: {
    borderBottom: "1px solid rgba(214, 222, 232, 0.85)",
    padding: "12px 12px",
    color: "var(--foreground)",
    fontSize: 14,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    background: "#fff",
  } as React.CSSProperties,

  toolbarChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 9px",
    borderRadius: 999,
    background: "rgba(31, 58, 95, 0.08)",
    color: "var(--accent)",
    fontWeight: 600,
    fontSize: 13,
  } as React.CSSProperties,

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 24, 40, 0.42)",
    backdropFilter: "blur(4px)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  } as React.CSSProperties,

  modalCard: {
    width: "100%",
    maxWidth: 880,
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    boxShadow: "var(--shadow-strong)",
    overflowX: "hidden",
  } as React.CSSProperties,

  modalHeader: {
    padding: "16px 18px",
    borderBottom: "1px solid var(--border)",
    background: "var(--panel-strong)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  } as React.CSSProperties,

  modalBody: {
    padding: 18,
    background: "#fff",
  } as React.CSSProperties,

  modalFooter: {
    padding: "16px 18px",
    borderTop: "1px solid var(--border)",
    background: "var(--panel-strong)",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  } as React.CSSProperties,

  badge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    color: "var(--muted-strong)",
    fontSize: 12,
    fontWeight: 600,
  } as React.CSSProperties,
} as const;
