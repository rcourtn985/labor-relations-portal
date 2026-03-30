"use client";

import React, { useEffect, useRef } from "react";

type AgreementTextViewerProps = {
  extractedText: string | null;
  searchQuery: string;
  searchMode: "context" | "precise";
  activeMatchIndex: number;
  onMatchCountChange: (count: number) => void;
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHighlightedNodes(
  text: string,
  query: string,
  searchMode: "context" | "precise",
  activeMatchIndex: number
): React.ReactNode[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [<React.Fragment key="full">{text}</React.Fragment>];
  }

  const escaped = escapeRegex(trimmed);
  const pattern =
    searchMode === "precise" ? `(\\b${escaped}\\b)` : `(${escaped})`;
  const parts = text.split(new RegExp(pattern, "gi"));
  let matchIdx = 0;

  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const isActive = matchIdx++ === activeMatchIndex;
      return (
        <mark
          key={i}
          style={{
            background: isActive
              ? "rgba(251,191,36,0.9)"
              : "rgba(253,224,71,0.45)",
            outline: isActive ? "2px solid rgba(245,158,11,0.6)" : "none",
            borderRadius: 2,
            padding: "0 1px",
            color: "inherit",
          }}
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function AgreementTextViewer({
  extractedText,
  searchQuery,
  searchMode,
  activeMatchIndex,
  onMatchCountChange,
}: AgreementTextViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const trimmedQuery = searchQuery.trim();

  // Count matches
  let matchCount = 0;
  if (trimmedQuery && extractedText) {
    const escaped = escapeRegex(trimmedQuery);
    const pattern =
      searchMode === "precise" ? `\\b${escaped}\\b` : escaped;
    const matches = extractedText.match(new RegExp(pattern, "gi"));
    matchCount = matches ? matches.length : 0;
  }

  // Report match count to parent
  useEffect(() => {
    onMatchCountChange(matchCount);
  }, [matchCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to active match
  useEffect(() => {
    if (!containerRef.current || matchCount === 0) return;
    const marks = containerRef.current.querySelectorAll("mark");
    const target = marks[activeMatchIndex];
    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeMatchIndex, matchCount]);

  if (!extractedText) {
    return (
      <div style={{ padding: 24, color: "var(--muted)", fontStyle: "italic" }}>
        No extracted text available for this agreement.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "20px 24px",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 14,
        lineHeight: 1.75,
        color: "var(--foreground)",
        background: "#fff",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {trimmedQuery
        ? buildHighlightedNodes(extractedText, trimmedQuery, searchMode, activeMatchIndex)
        : extractedText}
    </div>
  );
}
