"use client";

import { useState } from "react";
import AccessRequestsClient from "./access-requests/AccessRequestsClient";
import ActiveUsersClient from "./active-users/ActiveUsersClient";
import CanonicalAgreementHealthCard from "./CanonicalAgreementHealthCard";

export default function AdminPageClient() {
  const [refreshVersion, setRefreshVersion] = useState(0);

  function triggerRefresh() {
    setRefreshVersion((current) => current + 1);
  }

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 20px 40px",
        display: "grid",
        gap: 18,
      }}
    >
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 20,
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 8 }}>Site Administration</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Review access requests, manage active users, adjust chapter
          assignments, control account access, and monitor canonical agreement
          data health.
        </p>
      </div>

      <CanonicalAgreementHealthCard refreshVersion={refreshVersion} />

      <AccessRequestsClient
        refreshVersion={refreshVersion}
        onDataChanged={triggerRefresh}
      />
      <ActiveUsersClient refreshVersion={refreshVersion} />
    </div>
  );
}