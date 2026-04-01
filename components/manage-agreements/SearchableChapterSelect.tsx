"use client";

import { useEffect, useMemo, useState } from "react";

export type ChapterOption = {
  id: string;
  name: string;
  code: string | null;
};

type SearchableChapterSelectProps = {
  label: string;
  value: string;
  options: ChapterOption[];
  required?: boolean;
  disabled?: boolean;
  locked?: boolean;
  placeholder?: string;
  noResultsText?: string;
  onChange: (value: string) => void;
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  fontSize: 13,
  color: "var(--muted-strong)",
};

const requiredMark = (
  <span style={{ color: "#c0392b", marginLeft: 2 }}>*</span>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--border)",
  padding: "12px 14px",
  background: "white",
};

const MAX_VISIBLE_OPTIONS = 100;

export default function SearchableChapterSelect({
  label,
  value,
  options,
  required = false,
  disabled = false,
  locked = false,
  placeholder = "Start typing a chapter name",
  noResultsText = "No chapters found.",
  onChange,
}: SearchableChapterSelectProps) {
  const [search, setSearch] = useState(value);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (!needle) {
      return options.slice(0, MAX_VISIBLE_OPTIONS);
    }

    return options
      .filter((option) =>
        `${option.name} ${option.code ?? ""}`.toLowerCase().includes(needle)
      )
      .slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, search]);

  const selectedOption = useMemo(() => {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) return null;

    return (
      options.find((option) => option.name.trim().toLowerCase() === normalizedValue) ??
      null
    );
  }, [options, value]);

  function selectOption(option: ChapterOption) {
    setSearch(option.name);
    onChange(option.name);
    setDropdownOpen(false);
  }

  if (locked) {
    return (
      <div>
        <label style={labelStyle}>
          {label}
          {required ? requiredMark : null}
        </label>
        <input value={value} style={inputStyle} disabled />
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <label style={labelStyle}>
        {label}
        {required ? requiredMark : null}
      </label>

      <input
        type="text"
        value={search}
        onFocus={() => setDropdownOpen(true)}
        onChange={(event) => {
          const nextValue = event.target.value;
          setSearch(nextValue);
          onChange(nextValue);
          setDropdownOpen(true);
        }}
        placeholder={placeholder}
        style={inputStyle}
        disabled={disabled}
      />

      {dropdownOpen && !disabled ? (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            border: "1px solid var(--border)",
            borderRadius: 14,
            background: "var(--panel)",
            boxShadow: "var(--shadow-strong)",
            maxHeight: 260,
            overflowY: "auto",
            zIndex: 40,
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={`${option.id}-${option.name}`}
                type="button"
                onClick={() => selectOption(option)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(214, 222, 232, 0.5)",
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--foreground)" }}>
                  {option.name}
                </div>
                {option.code ? (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {option.code}
                  </div>
                ) : null}
              </button>
            ))
          ) : (
            <div
              style={{
                padding: "12px 14px",
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              {noResultsText}
            </div>
          )}
        </div>
      ) : null}

      {selectedOption ? (
        <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
          Selected: {selectedOption.name}
          {selectedOption.code ? ` (${selectedOption.code})` : ""}
        </div>
      ) : null}
    </div>
  );
}