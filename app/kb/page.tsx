"use client";

import { useEffect, useState } from "react";

type KBEntry = { id: string; name: string; vectorStoreId: string };
type KBIndexResponse = { central: KBEntry; systemKbs?: KBEntry[]; userKbs: KBEntry[] };

type KBFilesResponse = {
  kbId: string;
  kbName: string;
  vectorStoreId: string;
  files: {
    id: string;
    file_id: string;
    filename: string | null;
    created_at: number;
    status: string;
  }[];
};

export default function KBManagerPage() {
  const [kbIndex, setKbIndex] = useState<KBIndexResponse | null>(null);
  const [selectedKbId, setSelectedKbId] = useState<string>("central");
  const [loading, setLoading] = useState(false);

  const [filesLoading, setFilesLoading] = useState(false);
  const [filesData, setFilesData] = useState<KBFilesResponse | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Create KB form state
  const [newKbName, setNewKbName] = useState("");
  const [newKbFiles, setNewKbFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const btnStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #ccc",
    background: "#f5f5f5",
    color: "#111",
    cursor: "pointer",
    fontWeight: 600,
  };

  async function loadKbs() {
    const res = await fetch("/api/kb/list");
    const data = (await res.json()) as KBIndexResponse;
    setKbIndex(data);
    return data;
  }

  async function loadFiles(kbId: string) {
    setFilesLoading(true);
    setError(null);
    setFilesData(null);

    try {
      const res = await fetch(`/api/kb/files?kbId=${encodeURIComponent(kbId)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Failed to load files.");
        return;
      }
      setFilesData(data as KBFilesResponse);
    } catch {
      setError("Failed to load files.");
    } finally {
      setFilesLoading(false);
    }
  }

  async function createKb() {
    setCreateError(null);
    setCreateStatus(null);

    const name = newKbName.trim();
    if (!name) {
      setCreateError("Please enter a KB name.");
      return;
    }
    if (newKbFiles.length === 0) {
      setCreateError("Please select at least one file.");
      return;
    }

    try {
      setIsCreating(true);
      setCreateStatus("Uploading and indexing… (this can take a minute)");

      const form = new FormData();
      form.append("name", name);
      for (const f of newKbFiles) form.append("files", f);

      const res = await fetch("/api/kb/create", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Create failed");
      }

      setCreateStatus("Created! Refreshing list…");

      await loadKbs();

      // Auto-select the created KB and load its files
      if (data?.id) {
        setSelectedKbId(data.id);
        await loadFiles(data.id);
      }

      setNewKbName("");
      setNewKbFiles([]);

      setCreateStatus("Done.");
    } catch (e: any) {
      setCreateError(e?.message ?? "Create failed");
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadKbs();
        setSelectedKbId("central");
        await loadFiles("central");
      } catch {
        setError("Failed to load knowledge bases.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sortedFiles =
    filesData?.files
      ? [...filesData.files].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
      : [];

  return (
    <div style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      {/* Simple nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>KB Manager</h1>
          <div style={{ color: "#555", marginTop: 6 }}>
            Manage knowledge bases and their files. (Central is read-only.)
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <button style={btnStyle}>← Back to Chat</button>
          </a>
        </div>
      </div>

      {/* Create KB */}
      <div
        style={{
          marginTop: 18,
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 700 }}>Create Knowledge Base</div>
        <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
          Upload 1+ files to create a new private KB (stored in OpenAI + tracked in Prisma).
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="KB name (e.g., Louisiana)"
            value={newKbName}
            onChange={(e) => setNewKbName(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ccc",
              minWidth: 280,
            }}
          />

          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => setNewKbFiles(Array.from(e.target.files ?? []))}
          />

          <button
            onClick={createKb}
            disabled={isCreating}
            style={{
              ...btnStyle,
              background: isCreating ? "#eee" : "#f5f5f5",
              cursor: isCreating ? "not-allowed" : "pointer",
            }}
          >
            {isCreating ? "Creating…" : "Create KB"}
          </button>
        </div>

        {createStatus && <div style={{ marginTop: 10, color: "#555" }}>{createStatus}</div>}
        {createError && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #f2caca",
              background: "#fff6f6",
            }}
          >
            <b style={{ color: "#b00020" }}>Create error:</b> {createError}
          </div>
        )}
      </div>

      {/* KB selector */}
      <div
        style={{
          marginTop: 18,
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <b>Knowledge Base:</b>

        <select
          value={selectedKbId}
          onChange={(e) => setSelectedKbId(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
            backgroundColor: "#ffffff",
            color: "#000000",
            fontSize: 14,
            minWidth: 280,
          }}
        >
          <option value="central">{kbIndex?.central?.name ?? "Central Intelligence"}</option>

          {(kbIndex?.systemKbs ?? [])
            .filter((k) => k.id !== "central")
            .map((kb) => (
              <option key={kb.id} value={kb.id}>
                {kb.name}
              </option>
            ))}

          {(kbIndex?.userKbs ?? []).map((kb) => (
            <option key={kb.id} value={kb.id}>
              {kb.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => loadFiles(selectedKbId)}
          disabled={filesLoading}
          style={{
            ...btnStyle,
            background: filesLoading ? "#eee" : "#f5f5f5",
            cursor: filesLoading ? "not-allowed" : "pointer",
          }}
        >
          {filesLoading ? "Loading…" : "Load Files"}
        </button>

        <button
          onClick={() => loadKbs().catch(() => setError("Failed to refresh KB list."))}
          disabled={loading}
          style={{
            ...btnStyle,
            background: loading ? "#eee" : "#f5f5f5",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Refresh KBs
        </button>

        {loading && <span style={{ color: "#777" }}>Loading KBs…</span>}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #f2caca",
            background: "#fff6f6",
          }}
        >
          <b style={{ color: "#b00020" }}>Error:</b> {error}
          <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
            Tip: open <code>/api/kb/files?kbId={selectedKbId}</code> in your browser to see full
            JSON details.
          </div>
        </div>
      )}

      {/* Files panel */}
      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Files</div>
            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
              KB: <b>{filesData?.kbName ?? "(none loaded)"}</b>
              {filesData?.vectorStoreId ? (
                <>
                  {" "}
                  • Vector Store: <code>{filesData.vectorStoreId}</code>
                </>
              ) : null}
              {filesData ? (
                <>
                  {" "}
                  • Count: <b>{sortedFiles.length}</b>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {filesLoading && <div>Loading files…</div>}

          {!filesLoading && !filesData && (
            <div style={{ color: "#777" }}>Click “Load Files” to view uploads.</div>
          )}

          {!filesLoading && filesData && (
            <>
              {sortedFiles.length === 0 ? (
                <div style={{ color: "#777" }}>No files attached.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>
                          Filename
                        </th>
                        <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>
                          Uploaded
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFiles.map((f) => (
                        <tr key={f.id}>
                          <td style={{ borderBottom: "1px solid #f3f3f3", padding: 8 }}>
                            {f.filename ?? "(unknown)"}
                          </td>
                          <td style={{ borderBottom: "1px solid #f3f3f3", padding: 8 }}>
                            {f.created_at ? new Date(f.created_at * 1000).toLocaleString() : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}