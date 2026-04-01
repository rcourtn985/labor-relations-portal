"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = new Set(["/", "/chat"]);

export default function TopbarAgreementButton() {
  const pathname = usePathname();

  if (pathname && HIDDEN_PATHS.has(pathname)) {
    return null;
  }

  return (
    <Link
      href="/"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--panel)",
        color: "var(--foreground)",
        fontWeight: 800,
        fontSize: 14,
        textDecoration: "none",
        boxShadow: "var(--shadow-soft)",
        transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
      }}
    >
      Agreement Database
    </Link>
  );
}