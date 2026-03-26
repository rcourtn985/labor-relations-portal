"use client";

import React, { useMemo } from "react";

type AgreementPdfViewerProps = {
  fileUrl: string;
  searchQuery: string;
};

function buildAbsoluteFileUrl(fileUrl: string): string {
  if (typeof window === "undefined") {
    return fileUrl;
  }

  try {
    return new URL(fileUrl, window.location.origin).toString();
  } catch {
    return fileUrl;
  }
}

function buildViewerUrl(fileUrl: string, searchQuery: string): string {
  const absoluteFileUrl = buildAbsoluteFileUrl(fileUrl);
  const trimmed = searchQuery.trim();

  const params = new URLSearchParams({
    file: absoluteFileUrl,
  });

  if (trimmed) {
    params.set("search", trimmed);
  }

  return `/pdfjs/viewer.html?${params.toString()}`;
}

export default function AgreementPdfViewer({
  fileUrl,
  searchQuery,
}: AgreementPdfViewerProps) {
  const viewerUrl = useMemo(() => {
    return buildViewerUrl(fileUrl, searchQuery);
  }, [fileUrl, searchQuery]);

  return (
    <div
      className="lr-agreement-pdf-viewer"
      style={{
        height: "100%",
        minHeight: 0,
        background: "#fff",
      }}
    >
      <iframe
        title="Agreement PDF Viewer"
        src={viewerUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "#fff",
        }}
      />
    </div>
  );
}