"use client";

import { useEffect, useRef, useState } from "react";
import { FilterOption } from "./types";
import { summarizeMultiSelect } from "./utils";

type MultiSelectDropdownProps = {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (nextValues: string[]) => void;
  allLabel: string;
  compactCountLabel: string;
  disabled?: boolean;
};

export default function MultiSelectDropdown({
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