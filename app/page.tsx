"use client";

import React, { useEffect, useRef, useState } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

type FilterOption = {
  value: string;
  label: string;
};

type ChatScopeFilters = {
  chapters: string[];
  localUnions: string[];
  agreementTypes: string[];
  states: string[];
  includeNationalAgreements: boolean;
};

const chapterOptions: FilterOption[] = [
  { value: "slcc", label: "Southeastern Line Constructors" },
  { value: "nfc", label: "North Florida Chapter" },
  { value: "gcc", label: "Gulf Coast Chapter" },
  { value: "carolinas", label: "Carolinas Chapter" },
];

const localUnionOptions: FilterOption[] = [
  { value: "66", label: "Local 66" },
  { value: "84", label: "Local 84" },
  { value: "104", label: "Local 104" },
  { value: "222", label: "Local 222" },
];

const agreementTypeOptions: FilterOption[] = [
  { value: "Inside", label: "Inside" },
  { value: "Outside Line", label: "Outside Line" },
  { value: "Residential", label: "Residential" },
  { value: "Teledata / VDV", label: "Teledata / VDV" },
  { value: "Utility", label: "Utility" },
  { value: "Tree Trimming", label: "Tree Trimming" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Other", label: "Other" },
];

const stateOptions: FilterOption[] = [
  { value: "AL", label: "AL" },
  { value: "AR", label: "AR" },
  { value: "FL", label: "FL" },
  { value: "GA", label: "GA" },
  { value: "LA", label: "LA" },
  { value: "MS", label: "MS" },
  { value: "NC", label: "NC" },
  { value: "SC", label: "SC" },
  { value: "TN", label: "TN" },
  { value: "TX", label: "TX" },
  { value: "VA", label: "VA" },
];

function getLabels(values: string[], options: FilterOption[]) {
  return values
    .map((value) => options.find((option) => option.value === value)?.label ?? value)
    .filter(Boolean);
}

function summarizeMultiSelect(
  values: string[],
  options: FilterOption[],
  allLabel: string,
  compactCountLabel?: string
) {
  if (values.length === 0) return allLabel;

  const labels = getLabels(values, options);

  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return labels.join(", ");

  return `${labels.length} ${compactCountLabel ?? "selected"}`;
}

type MultiSelectDropdownProps = {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (nextValues: string[]) => void;
  allLabel: string;
  compactCountLabel: string;
};

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  allLabel,
  compactCountLabel,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const buttonLabel = summarizeMultiSelect(
    selectedValues,
    options,
    allLabel,
    compactCountLabel
  );

  function toggleValue(value: string) {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    onChange([...selectedValues, value]);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label
        style={{
          display: "block",
          marginBottom: 6,
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--input-border)",
          background: "var(--input-bg)",
          color: "var(--foreground)",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {buttonLabel}
        </span>
        <span style={{ color: "var(--muted)" }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 100,
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--panel-strong)",
            boxShadow: "var(--shadow-soft), var(--glow)",
            padding: 10,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--foreground)",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: 600,
              }}
            >
              Clear selection (All)
            </button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {options.map((option) => {
              const checked = selectedValues.includes(option.value);

              return (
                <label
                  key={option.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: checked ? "rgba(86, 224, 255, 0.08)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<ChatScopeFilters>({
    chapters: ["slcc"],
    localUnions: [],
    agreementTypes: [],
    states: [],
    includeNationalAgreements: false,
  });

  async function send() {
    if (!input.trim() || loading) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: input }];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          kbId: "__all__",
        }),
      });

      const data = await res.json();

      const scopeNote =
        "Current page filters are visual only for now. Backend agreement scoping is not wired yet.";

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: `${data.text ?? data.error ?? "(no response)"}\n\n[${scopeNote}]`,
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Error calling the server route.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const activeChapterSummary = summarizeMultiSelect(
    filters.chapters,
    chapterOptions,
    "All",
    "chapters selected"
  );

  const activeLocalUnionSummary = summarizeMultiSelect(
    filters.localUnions,
    localUnionOptions,
    "All",
    "locals selected"
  );

  const activeAgreementTypeSummary = summarizeMultiSelect(
    filters.agreementTypes,
    agreementTypeOptions,
    "All",
    "types selected"
  );

  const activeStateSummary = summarizeMultiSelect(
    filters.states,
    stateOptions,
    "All",
    "states selected"
  );

  return (
    <div style={{ maxWidth: 1120, margin: "32px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Labor Relations Central Intelligence</h1>
          <div
            style={{
              marginTop: 8,
              color: "var(--muted)",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            Search and chat across your labor agreements.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--panel)",
            }}
          >
            <input
              type="checkbox"
              checked={filters.includeNationalAgreements}
              onChange={(e) =>
                setFilters((current) => ({
                  ...current,
                  includeNationalAgreements: e.target.checked,
                }))
              }
            />
            <span>National Agreements</span>
          </label>

          <a
            href="/kb"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border-strong)",
              background:
                "linear-gradient(135deg, rgba(255, 89, 214, 0.20), rgba(86, 224, 255, 0.16))",
              color: "var(--foreground)",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Manage My Agreements
          </a>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft), var(--glow)",
          backdropFilter: "blur(10px)",
          padding: 16,
          position: "relative",
          zIndex: 30,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted-strong)",
            marginBottom: 14,
          }}
        >
          Agreement Scope
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <MultiSelectDropdown
            label="Chapter"
            options={chapterOptions}
            selectedValues={filters.chapters}
            onChange={(nextValues) =>
              setFilters((current) => ({
                ...current,
                chapters: nextValues,
              }))
            }
            allLabel="All Chapters"
            compactCountLabel="chapters selected"
          />

          <MultiSelectDropdown
            label="Local Union"
            options={localUnionOptions}
            selectedValues={filters.localUnions}
            onChange={(nextValues) =>
              setFilters((current) => ({
                ...current,
                localUnions: nextValues,
              }))
            }
            allLabel="All Local Unions"
            compactCountLabel="locals selected"
          />

          <MultiSelectDropdown
            label="Agreement Type"
            options={agreementTypeOptions}
            selectedValues={filters.agreementTypes}
            onChange={(nextValues) =>
              setFilters((current) => ({
                ...current,
                agreementTypes: nextValues,
              }))
            }
            allLabel="All Agreement Types"
            compactCountLabel="types selected"
          />

          <MultiSelectDropdown
            label="State(s)"
            options={stateOptions}
            selectedValues={filters.states}
            onChange={(nextValues) =>
              setFilters((current) => ({
                ...current,
                states: nextValues,
              }))
            }
            allLabel="All States"
            compactCountLabel="states selected"
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "rgba(255,255,255,0.03)",
          color: "var(--muted-strong)",
          fontSize: 13,
          lineHeight: 1.6,
          position: "relative",
          zIndex: 20,
        }}
      >
        <b>Searching:</b> My Agreements
        {filters.includeNationalAgreements ? " + National Agreements" : ""}
        {" | "}
        <b>Chapters:</b> {activeChapterSummary}
        {" | "}
        <b>Local Union:</b> {activeLocalUnionSummary}
        {" | "}
        <b>Agreement Type:</b> {activeAgreementTypeSummary}
        {" | "}
        <b>States:</b> {activeStateSummary}
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 16,
          minHeight: 460,
          marginTop: 16,
          whiteSpace: "pre-wrap",
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft), var(--glow)",
          backdropFilter: "blur(10px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 10 }}>
          Agreement Chat
        </div>

        {messages.length === 0 && (
          <div style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Ask a question about your agreements. This version is focused on helping
            you visualize the future chat workspace. The filter bar above is live in
            the UI, but not yet connected to backend agreement filtering.
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <b>{m.role === "user" ? "You" : "Assistant"}:</b> {m.content}
          </div>
        ))}

        {loading && <div>Assistant is thinking…</div>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question about your agreements..."
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--foreground)",
          }}
        />

        <button
          onClick={send}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--border-strong)",
            background:
              "linear-gradient(135deg, rgba(255, 89, 214, 0.20), rgba(86, 224, 255, 0.16))",
            color: "var(--foreground)",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}