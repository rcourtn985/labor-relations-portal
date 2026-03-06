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

  // CBA options (applies to all files for this create action)
  const [isCba, setIsCba] = useState(false);
  const [shareToCbas, setShareToCbas] = useState(false);
  const [chapter, setChapter] = useState("");
  const [localUnion, setLocalUnion] = useState("");
  const [cbaType, setCbaType] = useState("");
  const [states, setStates] = useState("");

  const styles = {
    page: {
      maxWidth: 980,
      margin: "40px auto",
      padding: 16,
      color: "var(--foreground)",
    } as React.CSSProperties,

    // “glass card”
    card: {
      marginTop: 18,
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: 14,
      background: "var(--panel)",
      boxShadow: "var(--glow)",
      backdropFilter: "blur(10px)",
    } as React.CSSProperties,

    subtext: {
      color: "var(--muted)",
      fontSize: 12,
      marginTop: 6,
      lineHeight: 1.35,
    } as React.CSSProperties,

    btn: {
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid var(--button-border)",
      background: "var(--button-bg)",
      color: "var(--foreground)",
      cursor: "pointer",
      fontWeight: 700,
      letterSpacing: 0.2,
    } as React.CSSProperties,

    btnDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
    } as React.CSSProperties,

    row: {
      marginTop: 10,
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
    } as React.CSSProperties,

    input: {
      padding: 9,
      borderRadius: 12,
      border: "1px solid var(--input-border)",
      background: "var(--input-bg)",
      color: "var(--foreground)",
      fontSize: 14,
      outline: "none",
    } as React.CSSProperties,

    select: {
      padding: 9,
      borderRadius: 12,
      border: "1px solid var(--input-border)",
      background: "var(--input-bg)",
      color: "var(--foreground)",
      fontSize: 14,
      outline: "none",
      minWidth: 280,
    } as React.CSSProperties,

    badge: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid var(--border)",
      background: "var(--panel-strong)",
      color: "var(--muted)",
      fontSize: 12,
    } as React.CSSProperties,

    tableWrap: {
      overflowX: "auto",
      border: "1px solid var(--border)",
      borderRadius: 12,
    } as React.CSSProperties,

    table: {
      width: "100%",
      borderCollapse: "collapse",
      color: "var(--foreground)",
    } as React.CSSProperties,

    th: {
      textAlign: "left",
      borderBottom: "1px solid var(--border)",
      padding: 10,
      background: "var(--table-header)",
      color: "var(--foreground)",
      fontWeight: 700,
      fontSize: 13,
    } as React.CSSProperties,

    td: {
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      padding: 10,
      color: "var(--foreground)",
      fontSize: 14,
    } as React.CSSProperties,

    hint: {
      color: "var(--muted)",
      fontSize: 12,
    } as React.CSSProperties,

    errorBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 14,
      border: "1px solid rgba(255, 79, 216, 0.35)",
      background: "rgba(255, 79, 216, 0.10)",
      color: "var(--foreground)",
    } as React.CSSProperties,

    errorTitle: {
      color: "var(--accent)",
      fontWeight: 800,
    } as React.CSSProperties,
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

    if (isCba && !states.trim()) {
      setCreateError("If this is a CBA, please enter State(s) (e.g., LA, MS).");
      return;
    }

    try {
      setIsCreating(true);
      setCreateStatus("Uploading and indexing… (this can take a minute)");

      const form = new FormData();
      form.append("name", name);
      for (const f of newKbFiles) form.append("files", f);

      // CBA flags + metadata
      form.append("isCba", isCba ? "true" : "false");
      form.append("shareToCbas", isCba && shareToCbas ? "true" : "false");
      form.append("chapter", chapter.trim());
      form.append("localUnion", localUnion.trim());
      form.append("cbaType", cbaType.trim());
      form.append("state", states.trim());

      const res = await fetch("/api/kb/create", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Create failed");
      }

      setCreateStatus("Created! Refreshing list…");

      await loadKbs();

      if (data?.id) {
        setSelectedKbId(data.id);
        await loadFiles(data.id);
      }

      setNewKbName("");
      setNewKbFiles([]);

      setIsCba(false);
      setShareToCbas(false);
      setChapter("");
      setLocalUnion("");
      setCbaType("");
      setStates("");

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
    <div style={styles.page}>
      {/* Placeholder styling (vaporwave friendly) */}
      <style jsx global>{`
        input::placeholder,
        textarea::placeholder {
          color: rgba(242, 240, 255, 0.65) !important;
          opacity: 1;
        }
      `}</style>

      {/* Header */}
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
          <h1 style={{ margin: 0, letterSpacing: 0.3 }}>KB Manager</h1>
          <div style={styles.subtext}>
            Manage knowledge bases and their files. <span style={styles.badge}>Central is read-only</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <button style={styles.btn}>← Back to Chat</button>
          </a>
        </div>
      </div>

      {/* Create KB */}
      <div style={styles.card}>
        <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>Create Knowledge Base</div>
        <div style={styles.subtext}>
          Upload 1+ files to create a private KB. If it’s a CBA, you can also add it to{" "}
          <span style={{ color: "var(--accent-2)", fontWeight: 800 }}>All CBAs</span>.
        </div>

        <div style={styles.row}>
          <input
            type="text"
            placeholder="KB name (e.g., Louisiana)"
            value={newKbName}
            onChange={(e) => setNewKbName(e.target.value)}
            style={{ ...styles.input, minWidth: 280 }}
          />

          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => setNewKbFiles(Array.from(e.target.files ?? []))}
            style={{ ...styles.input, padding: 6 }}
          />

          <button
            onClick={createKb}
            disabled={isCreating}
            style={{
              ...styles.btn,
              ...(isCreating ? styles.btnDisabled : null),
            }}
          >
            {isCreating ? "Creating…" : "Create KB"}
          </button>
        </div>

        {/* CBA flags */}
        <div style={{ marginTop: 12, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={isCba}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsCba(checked);
                if (!checked) setShareToCbas(false);
              }}
            />
            <span style={{ fontWeight: 800 }}>This upload is a CBA</span>
          </label>

          {isCba && (
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={shareToCbas} onChange={(e) => setShareToCbas(e.target.checked)} />
              <span>
                Also add to <span style={{ color: "var(--accent-2)", fontWeight: 800 }}>All CBAs</span>
              </span>
            </label>
          )}
        </div>

        {/* CBA metadata */}
        {isCba && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--panel-strong)",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>CBA metadata</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Chapter"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                style={{ ...styles.input, minWidth: 220 }}
              />

              <input
                type="text"
                placeholder="Local Union"
                value={localUnion}
                onChange={(e) => setLocalUnion(e.target.value)}
                style={{ ...styles.input, minWidth: 220 }}
              />

              <input
                type="text"
                placeholder="CBA Type"
                value={cbaType}
                onChange={(e) => setCbaType(e.target.value)}
                style={{ ...styles.input, minWidth: 220 }}
              />

              <input
                type="text"
                placeholder="State(s) (e.g., LA, MS)"
                value={states}
                onChange={(e) => setStates(e.target.value)}
                style={{ ...styles.input, minWidth: 260 }}
              />
            </div>

            <div style={{ marginTop: 8, ...styles.hint }}>
              Tip: State(s) can be a comma-separated list for now (e.g., <code>LA, MS</code>).
            </div>
          </div>
        )}

        {createStatus && <div style={{ marginTop: 10, color: "var(--muted)" }}>{createStatus}</div>}
        {createError && (
          <div style={{ marginTop: 10, ...styles.errorBox }}>
            <span style={styles.errorTitle}>Create error:</span> {createError}
          </div>
        )}
      </div>

      {/* KB selector */}
      <div style={styles.card}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <b>Knowledge Base:</b>

          <select
            value={selectedKbId}
            onChange={(e) => setSelectedKbId(e.target.value)}
            style={styles.select}
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
              ...styles.btn,
              ...(filesLoading ? styles.btnDisabled : null),
            }}
          >
            {filesLoading ? "Loading…" : "Load Files"}
          </button>

          <button
            onClick={() => loadKbs().catch(() => setError("Failed to refresh KB list."))}
            disabled={loading}
            style={{
              ...styles.btn,
              ...(loading ? styles.btnDisabled : null),
            }}
          >
            Refresh KBs
          </button>

          {loading && <span style={{ color: "var(--muted)" }}>Loading KBs…</span>}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <span style={styles.errorTitle}>Error:</span> {error}
          <div style={{ marginTop: 6, ...styles.hint }}>
            Tip: open <code>/api/kb/files?kbId={selectedKbId}</code> in your browser to see full JSON details.
          </div>
        </div>
      )}

      {/* Files panel */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Files</div>
            <div style={styles.subtext}>
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
          {filesLoading && <div style={{ color: "var(--muted)" }}>Loading files…</div>}

          {!filesLoading && !filesData && (
            <div style={{ color: "var(--muted)" }}>Click “Load Files” to view uploads.</div>
          )}

          {!filesLoading && filesData && (
            <>
              {sortedFiles.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>No files attached.</div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Filename</th>
                        <th style={styles.th}>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFiles.map((f) => (
                        <tr key={f.id}>
                          <td style={styles.td}>{f.filename ?? "(unknown)"}</td>
                          <td style={styles.td}>
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