"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
};

type MultiSelectDropdownProps = {
  label: string;
  options: Option[];
  selectedValues: string[];
  onChange: (nextValues: string[]) => void;
  allLabel?: string;
  compactCountLabel?: string;
  disabled?: boolean;
};

function summarizeSelection(
  selectedValues: string[],
  options: Option[],
  allLabel: string,
  compactCountLabel: string
) {
  if (selectedValues.length === 0) return allLabel;

  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  if (selectedLabels.length <= 2) {
    return selectedLabels.join(", ");
  }

  return `${selectedLabels.length} ${compactCountLabel}`;
}

export default function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  allLabel = "All",
  compactCountLabel = "selected",
  disabled = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(needle)
    );
  }, [options, search]);

  const buttonLabel = summarizeSelection(
    selectedValues,
    options,
    allLabel,
    compactCountLabel
  );

  function toggleValue(value: string) {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
      return;
    }

    onChange([...selectedValues, value]);
  }

  function clearSelection() {
    onChange([]);
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--muted-strong)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        style={{
          width: "100%",
          minHeight: 42,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--input-border)",
          background: disabled ? "var(--panel-strong)" : "#fff",
          color: "var(--foreground)",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          boxShadow: "var(--shadow-soft)",
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

        <span style={{ color: "var(--muted-strong)", flexShrink: 0 }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 100,
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "#fff",
            boxShadow: "var(--shadow-strong)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 10,
              borderBottom: "1px solid var(--border)",
              background: "var(--panel-strong)",
            }}
          >
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "#fff",
                color: "var(--foreground)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              maxHeight: 260,
              overflowY: "auto",
              padding: 8,
            }}
          >
            <button
              type="button"
              onClick={clearSelection}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                background: "transparent",
                borderRadius: 8,
                cursor: "pointer",
                color: "var(--muted-strong)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Clear selection
            </button>

            {filteredOptions.length === 0 && (
              <div
                style={{
                  padding: "10px 12px",
                  color: "var(--muted)",
                  fontSize: 14,
                }}
              >
                No matches found.
              </div>
            )}

            {filteredOptions.map((option) => {
              const checked = selectedValues.includes(option.value);

              return (
                <label
                  key={option.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: checked ? "rgba(31, 58, 95, 0.06)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(option.value)}
                  />
                  <span style={{ color: "var(--foreground)", fontSize: 14 }}>
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}