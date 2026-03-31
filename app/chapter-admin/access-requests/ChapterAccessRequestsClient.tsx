"use client";

import { useEffect, useMemo, useState } from "react";

type AccessRequestRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  comments: string | null;
  requestedMembershipRole: "USER";
  status: "PENDING" | "APPROVED" | "DENIED";
  submittedAt: string;
  reviewedAt: string | null;
  denialReason: string | null;
  adminNotes: string | null;
  chapter: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  reviewedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type AccessRequestsResponse = {
  requests: AccessRequestRow[];
};

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "DENIED";

export default function ChapterAccessRequestsClient() {
  const [requests, setRequests] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [search, setSearch] = useState("");

  const [selectedRequest, setSelectedRequest] = useState<AccessRequestRow | null>(
    null
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadRequests() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/chapter-admin/access-requests");
      const data = (await res.json()) as AccessRequestsResponse & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load access requests.");
      }

      setRequests(data.requests ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load access requests.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "ALL" || request.status === statusFilter;

      const haystack = [
        request.firstName,
        request.lastName,
        request.email,
        request.phone ?? "",
        request.chapter?.name ?? "",
        request.chapter?.code ?? "",
        request.comments ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !needle || haystack.includes(needle);

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  function openRequest(request: AccessRequestRow) {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes ?? "");
    setDenialReason(request.denialReason ?? "");
    setSaveError(null);
  }

  function closeRequest() {
    if (saving) return;
    setSelectedRequest(null);
    setAdminNotes("");
    setDenialReason("");
    setSaveError(null);
  }

  async function updateRequest(status: "PENDING" | "APPROVED" | "DENIED") {
    if (!selectedRequest) return;

    try {
      setSaving(true);
      setSaveError(null);

      const res = await fetch(
        `/api/chapter-admin/access-requests/${encodeURIComponent(selectedRequest.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            adminNotes,
            denialReason: status === "DENIED" ? denialReason : "",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update access request.");
      }

      await loadRequests();
      closeRequest();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update access request.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 20,
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
          padding: 20,
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: "12px 14px",
                background: "white",
              }}
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, chapter, phone, or comments"
              style={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: "12px 14px",
                background: "white",
              }}
            />
          </label>
        </div>

        {error ? (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(169, 68, 68, 0.25)",
              background: "rgba(169, 68, 68, 0.08)",
              color: "var(--danger)",
              padding: "10px 12px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            overflowX: "auto",
            border: "1px solid var(--border)",
            borderRadius: 16,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1020,
            }}
          >
            <thead>
              <tr>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Name</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Email</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Requested Access</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Chapter</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Phone</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Submitted</th>
                <th style={{ padding: "12px 14px", textAlign: "left" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 18, color: "var(--muted)" }}>
                    Loading access requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 18, color: "var(--muted)" }}>
                    No access requests match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700 }}>
                        {request.firstName} {request.lastName}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>{request.email}</td>
                    <td style={{ padding: "12px 14px" }}>Member Contractor</td>
                    <td style={{ padding: "12px 14px" }}>
                      {request.chapter?.name ?? "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>{request.phone ?? "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{request.status}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {new Date(request.submittedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        type="button"
                        onClick={() => openRequest(request)}
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--panel)",
                          borderRadius: 10,
                          padding: "8px 12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest ? (
        <div
          onClick={closeRequest}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16, 24, 40, 0.28)",
            display: "grid",
            placeItems: "center",
            padding: 24,
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 760,
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              boxShadow: "var(--shadow-strong)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 22px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {selectedRequest.firstName} {selectedRequest.lastName}
                </div>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>
                  {selectedRequest.email}
                </div>
              </div>

              <button
                type="button"
                onClick={closeRequest}
                disabled={saving}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 22, display: "grid", gap: 18 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Requested Access</div>
                  <div style={{ color: "var(--muted-strong)" }}>
                    Member Contractor
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Chapter</div>
                  <div style={{ color: "var(--muted-strong)" }}>
                    {selectedRequest.chapter?.name ?? "—"}
                    {selectedRequest.chapter?.code
                      ? ` (${selectedRequest.chapter.code})`
                      : ""}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Phone</div>
                  <div style={{ color: "var(--muted-strong)" }}>
                    {selectedRequest.phone ?? "—"}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Status</div>
                  <div style={{ color: "var(--muted-strong)" }}>
                    {selectedRequest.status}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Comments</div>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    background: "var(--panel-strong)",
                    padding: 14,
                    minHeight: 76,
                    color: "var(--muted-strong)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selectedRequest.comments?.trim() || "—"}
                </div>
              </div>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Admin Notes</span>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    padding: "12px 14px",
                    background: "white",
                    resize: "vertical",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Denial Reason</span>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={3}
                  placeholder="Required when denying a request"
                  style={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    padding: "12px 14px",
                    background: "white",
                    resize: "vertical",
                  }}
                />
              </label>

              {saveError ? (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(169, 68, 68, 0.25)",
                    background: "rgba(169, 68, 68, 0.08)",
                    color: "var(--danger)",
                    padding: "10px 12px",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {saveError}
                </div>
              ) : null}
            </div>

            <div
              style={{
                padding: "18px 22px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => updateRequest("PENDING")}
                disabled={saving}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--panel)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Mark Pending
              </button>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => updateRequest("DENIED")}
                  disabled={saving}
                  style={{
                    border: "1px solid rgba(169, 68, 68, 0.25)",
                    background: "rgba(169, 68, 68, 0.08)",
                    color: "var(--danger)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Deny"}
                </button>

                <button
                  type="button"
                  onClick={() => updateRequest("APPROVED")}
                  disabled={saving}
                  style={{
                    border: "none",
                    background: "var(--brand-gradient)",
                    color: "white",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}