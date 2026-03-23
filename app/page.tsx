"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

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

type ChatRequestBody = {
  messages: Msg[];
  filters: ChatScopeFilters;
};

type FilterOptionsResponse = {
  chapterOptions: FilterOption[];
  localUnionOptions: FilterOption[];
  agreementTypeOptions: FilterOption[];
  stateOptions: FilterOption[];
};

type UserRole = "USER" | "CHAPTER_ADMIN" | "SUPER_ADMIN";

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

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

type MultiSelectDropdownProps = {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (nextValues: string[]) => void;
  allLabel: string;
  compactCountLabel: string;
  disabled?: boolean;
};

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  allLabel,
  compactCountLabel,
  disabled = false,
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

  useEffect(() => {
    if (disabled && open) {
      setOpen(false);
    }
  }, [disabled, open]);

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
          marginBottom: 8,
          fontWeight: 700,
          fontSize: 13,
          color: "var(--muted-strong)",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        style={{
          width: "100%",
          padding: "11px 12px",
          borderRadius: 8,
          border: "1px solid var(--input-border)",
          background: "var(--input-bg)",
          color: "var(--foreground)",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          opacity: disabled ? 0.65 : 1,
          fontSize: 14,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
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

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            zIndex: 100,
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--panel)",
            boxShadow: "var(--shadow-strong)",
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
                padding: "9px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--panel-strong)",
                color: "var(--foreground)",
                cursor: "pointer",
                textAlign: "left",
                fontWeight: 600,
              }}
            >
              Clear selection
            </button>
          </div>

          {options.length === 0 ? (
            <div
              style={{
                padding: "8px 10px",
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              No options available.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {options.map((option) => {
                const checked = selectedValues.includes(option.value);

                return (
                  <label
                    key={option.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: 8,
                      background: checked ? "rgba(31, 58, 95, 0.08)" : "transparent",
                      cursor: "pointer",
                      border: checked
                        ? "1px solid rgba(31, 58, 95, 0.18)"
                        : "1px solid transparent",
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
          )}
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
    chapters: [],
    localUnions: [],
    agreementTypes: [],
    states: [],
    includeNationalAgreements: false,
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse>({
    chapterOptions: [],
    localUnionOptions: [],
    agreementTypeOptions: [],
    stateOptions: [],
  });

  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("CHAPTER_ADMIN");

  const canManageAgreements =
    currentUserRole === "CHAPTER_ADMIN" || currentUserRole === "SUPER_ADMIN";

  const chapterQueryKey = [...filters.chapters].sort().join("|");

  const loadFilterOptions = useCallback(async (chapters: string[]) => {
    setFilterOptionsLoading(true);
    setFilterOptionsError(null);

    try {
      const params = new URLSearchParams();

      for (const chapter of [...chapters].sort()) {
        params.append("chapters", chapter);
      }

      const queryString = params.toString();
      const url = queryString
        ? `/api/chat/filter-options?${queryString}`
        : "/api/chat/filter-options";

      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`Failed to load filter options (${res.status})`);
      }

      const data: FilterOptionsResponse = await res.json();

      setFilterOptions({
        chapterOptions: data.chapterOptions ?? [],
        localUnionOptions: data.localUnionOptions ?? [],
        agreementTypeOptions: data.agreementTypeOptions ?? [],
        stateOptions: data.stateOptions ?? [],
      });

      setFilters((current) => {
        const validChapterValues = new Set(
          (data.chapterOptions ?? []).map((option) => option.value)
        );
        const validLocalUnionValues = new Set(
          (data.localUnionOptions ?? []).map((option) => option.value)
        );
        const validAgreementTypeValues = new Set(
          (data.agreementTypeOptions ?? []).map((option) => option.value)
        );
        const validStateValues = new Set(
          (data.stateOptions ?? []).map((option) => option.value)
        );

        const nextChapters = current.chapters.filter((value) =>
          validChapterValues.has(value)
        );
        const nextLocalUnions = current.localUnions.filter((value) =>
          validLocalUnionValues.has(value)
        );
        const nextAgreementTypes = current.agreementTypes.filter((value) =>
          validAgreementTypeValues.has(value)
        );
        const nextStates = current.states.filter((value) =>
          validStateValues.has(value)
        );

        const unchanged =
          arraysEqual(nextChapters, current.chapters) &&
          arraysEqual(nextLocalUnions, current.localUnions) &&
          arraysEqual(nextAgreementTypes, current.agreementTypes) &&
          arraysEqual(nextStates, current.states);

        if (unchanged) {
          return current;
        }

        return {
          ...current,
          chapters: nextChapters,
          localUnions: nextLocalUnions,
          agreementTypes: nextAgreementTypes,
          states: nextStates,
        };
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load agreement filters.";

      setFilterOptionsError(message);
    } finally {
      setFilterOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions(filters.chapters);
  }, [chapterQueryKey, loadFilterOptions, filters.chapters]);

  useEffect(() => {
    function handleWindowFocus() {
      loadFilterOptions(filters.chapters);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadFilterOptions(filters.chapters);
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadFilterOptions, filters.chapters]);

  async function send() {
    if (!input.trim() || loading) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: input }];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const requestBody: ChatRequestBody = {
        messages: nextMessages,
        filters,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.text ?? data.error ?? "(no response)",
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
    filterOptions.chapterOptions,
    "All",
    "chapters selected"
  );

  const activeLocalUnionSummary = summarizeMultiSelect(
    filters.localUnions,
    filterOptions.localUnionOptions,
    "All",
    "locals selected"
  );

  const activeAgreementTypeSummary = summarizeMultiSelect(
    filters.agreementTypes,
    filterOptions.agreementTypeOptions,
    "All",
    "types selected"
  );

  const activeStateSummary = summarizeMultiSelect(
    filters.states,
    filterOptions.stateOptions,
    "All",
    "states selected"
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 24px" }}>
      <div
        style={{
          marginBottom: 18,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--panel)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <label
            htmlFor="role-simulator"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--muted-strong)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            Role Simulator
          </label>

          <select
            id="role-simulator"
            value={currentUserRole}
            onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--foreground)",
              fontWeight: 600,
            }}
          >
            <option value="USER">USER</option>
            <option value="CHAPTER_ADMIN">CHAPTER_ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        </div>
      </div>

      <div
        style={{
          borderRadius: 14,
          border: "1px solid rgba(31, 58, 95, 0.12)",
          background:
            "linear-gradient(135deg, rgba(31, 58, 95, 0.98) 0%, rgba(38, 72, 111, 0.98) 100%)",
          color: "#fff",
          padding: "24px 24px 22px",
          boxShadow: "var(--shadow-strong)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.78,
                marginBottom: 10,
              }}
            >
              Labor Relations Platform
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                color: "#ffffff",
              }}
            >
              Labor Relations Central Intelligence
            </h1>

            <div
              style={{
                marginTop: 12,
                color: "rgba(255,255,255,0.84)",
                fontSize: 15,
                lineHeight: 1.6,
                maxWidth: 760,
              }}
            >
              Search and chat across collective bargaining agreements using structured
              agreement filters and shared contract intelligence.
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
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontWeight: 600,
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

            {canManageAgreements && (
              <a
                href="/kb"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "11px 15px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "#ffffff",
                  color: "var(--accent)",
                  textDecoration: "none",
                  fontWeight: 700,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                }}
              >
                Manage Agreements
              </a>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--panel-strong)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted-strong)",
                marginBottom: 4,
              }}
            >
              Agreement Scope
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Narrow the agreements included in search and chat results.
            </div>
          </div>

          <div
            style={{
              color: "var(--muted-strong)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Role: {currentUserRole}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <MultiSelectDropdown
            label="Chapter"
            options={filterOptions.chapterOptions}
            selectedValues={filters.chapters}
            onChange={(nextValues) =>
              setFilters((current) => ({
                ...current,
                chapters: nextValues,
                localUnions: [],
                states: [],
              }))
            }
            allLabel="All Chapters"
            compactCountLabel="chapters selected"
            disabled={filterOptionsLoading}
          />

          <MultiSelectDropdown
            label="Local Union"
            options={filterOptions.localUnionOptions}
            selectedValues={filters.localUnions}
            onChange={(nextValues) =>
              setFilters((current) => ({
                ...current,
                localUnions: nextValues,
              }))
            }
            allLabel="All Local Unions"
            compactCountLabel="locals selected"
            disabled={filterOptionsLoading}
          />

          <MultiSelectDropdown
            label="Agreement Type"
            options={filterOptions.agreementTypeOptions}
            selectedValues={filters.agreementTypes}
            onChange={(nextValues) =>
              setFilters((current) => ({
                ...current,
                agreementTypes: nextValues,
              }))
            }
            allLabel="All Agreement Types"
            compactCountLabel="types selected"
            disabled={filterOptionsLoading}
          />

          <MultiSelectDropdown
            label="State(s)"
            options={filterOptions.stateOptions}
            selectedValues={filters.states}
            onChange={(nextValues) =>
              setFilters((current) => ({
                ...current,
                states: nextValues,
              }))
            }
            allLabel="All States"
            compactCountLabel="states selected"
            disabled={filterOptionsLoading}
          />
        </div>

        {filterOptionsError && (
          <div
            style={{
              margin: "0 16px 16px",
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid rgba(169, 68, 68, 0.22)",
              background: "rgba(169, 68, 68, 0.06)",
              color: "var(--foreground)",
              fontSize: 13,
            }}
          >
            Could not load filter options: {filterOptionsError}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--muted-strong)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Active Scope
        </span>

        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            background: "rgba(31, 58, 95, 0.08)",
            color: "var(--accent)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Chapters: {activeChapterSummary}
        </span>

        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            background: "rgba(31, 58, 95, 0.08)",
            color: "var(--accent)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Local Union: {activeLocalUnionSummary}
        </span>

        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            background: "rgba(31, 58, 95, 0.08)",
            color: "var(--accent)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Agreement Type: {activeAgreementTypeSummary}
        </span>

        <span
          style={{
            padding: "5px 9px",
            borderRadius: 999,
            background: "rgba(31, 58, 95, 0.08)",
            color: "var(--accent)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          States: {activeStateSummary}
        </span>

        {filters.includeNationalAgreements && (
          <span
            style={{
              padding: "5px 9px",
              borderRadius: 999,
              background: "rgba(47, 111, 126, 0.10)",
              color: "var(--accent-2)",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            National Included
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: 18,
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--panel)",
          boxShadow: "var(--shadow-strong)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--panel-strong)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted-strong)",
                marginBottom: 4,
              }}
            >
              Agreement Chat
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Ask contract-specific questions and review scoped answers.
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 16,
            minHeight: 420,
            whiteSpace: "pre-wrap",
            background: "#fff",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                color: "var(--muted)",
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              Ask a question about your agreements. Filters above determine the
              agreement set used for retrieval and response generation.
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                borderRadius: 10,
                border:
                  m.role === "user"
                    ? "1px solid rgba(31, 58, 95, 0.14)"
                    : "1px solid var(--border)",
                background:
                  m.role === "user" ? "rgba(31, 58, 95, 0.04)" : "var(--panel-strong)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: m.role === "user" ? "var(--accent)" : "var(--muted-strong)",
                  marginBottom: 6,
                }}
              >
                {m.role === "user" ? "You" : "Assistant"}
              </div>
              <div style={{ color: "var(--foreground)", lineHeight: 1.65 }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--panel-strong)",
                color: "var(--muted-strong)",
              }}
            >
              Assistant is thinking…
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: 16,
            background: "var(--panel-strong)",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask a question about your agreements..."
              style={{
                flex: 1,
                padding: 13,
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "#fff",
                color: "var(--foreground)",
                fontSize: 14,
              }}
            />

            <button
              onClick={send}
              style={{
                minWidth: 108,
                padding: "0 16px",
                borderRadius: 8,
                border: "1px solid #17314f",
                background: "var(--brand-gradient)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "var(--shadow-soft)",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}