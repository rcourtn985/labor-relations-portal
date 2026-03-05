"use client";

import { useEffect, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

type KBEntry = { id: string; name: string; vectorStoreId: string };
type KBIndexResponse = { central: KBEntry; userKbs: KBEntry[] };

const KB_STORAGE_KEY = "lrci_selected_kb";

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [kbIndex, setKbIndex] = useState<KBIndexResponse | null>(null);
  const [selectedKbId, setSelectedKbId] = useState<string>("central");

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

  useEffect(() => {
    (async () => {
      try {
        const data = await loadKbs();

        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem(KB_STORAGE_KEY)
            : null;

        const validIds = new Set<string>([
          "__all__",
          "central",
          ...(data.userKbs ?? []).map((k) => k.id),
        ]);

        const next = stored && validIds.has(stored) ? stored : "central";
        setSelectedKbId(next);
      } catch {
        setKbIndex(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KB_STORAGE_KEY, selectedKbId);
  }, [selectedKbId]);

  async function send() {
    if (!input.trim() || loading) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: input }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, kbId: selectedKbId }),
      });

      const data = await res.json();

      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.text ?? data.error ?? "(no response)" },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Error calling the server route." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const selectedKbLabel =
    selectedKbId === "__all__"
      ? "All Knowledge Bases"
      : selectedKbId === "central"
      ? kbIndex?.central?.name ?? "Central Intelligence"
      : kbIndex?.userKbs?.find((k) => k.id === selectedKbId)?.name ?? "Selected Knowledge Base";

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      {/* Simple nav/header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Labor Relations Central Intelligence</h1>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/kb" style={{ textDecoration: "none" }}>
            <button style={btnStyle}>KB Manager</button>
          </a>

          <button onClick={() => loadKbs().catch(() => setKbIndex(null))} style={btnStyle}>
            Refresh KBs
          </button>
        </div>
      </div>

      {/* KB selector */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          <b>Knowledge Base:</b>
        </label>

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
            minWidth: 260,
          }}
        >
          <option value="__all__">All Knowledge Bases</option>
          <option value="central">{kbIndex?.central?.name ?? "Central Intelligence"}</option>
          {(kbIndex?.userKbs ?? []).map((kb) => (
            <option key={kb.id} value={kb.id}>
              {kb.name}
            </option>
          ))}
        </select>

        {selectedKbId === "__all__" && (
          <span style={{ color: "#777" }}>(Searching all KBs may take longer)</span>
        )}
      </div>

      {/* Chat window */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          minHeight: 420,
          marginTop: 16,
          whiteSpace: "pre-wrap",
        }}
      >
        <div style={{ color: "#666", fontSize: 12, marginBottom: 10 }}>
          Active KB: <b>{selectedKbLabel}</b>
        </div>

        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <b>{m.role === "user" ? "You" : "Assistant"}:</b> {m.content}
          </div>
        ))}
        {loading && <div>Assistant is thinking…</div>}
      </div>

      {/* Chat input */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a labor relations question…"
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
        />
        <button onClick={send} style={btnStyle}>
          Send
        </button>
      </div>
    </div>
  );
}