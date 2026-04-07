"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ChapterOption = {
  id: string;
  name: string;
  code: string | null;
};

type RequestedAccessType = "USER" | "CHAPTER_ADMIN";

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const MAX_VISIBLE_CHAPTERS = 100;

export default function RequestAccessForm() {
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [comments, setComments] = useState("");
  const [requestedAccessType, setRequestedAccessType] =
    useState<RequestedAccessType>("USER");

  const [chapterSearch, setChapterSearch] = useState("");
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const chapterPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadChapters() {
      try {
        setChaptersLoading(true);
        setChaptersError(null);

        const res = await fetch("/api/chapters/public");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error ?? "Failed to load chapters.");
        }

        setChapters(data.chapters ?? []);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load chapters.";
        setChaptersError(message);
      } finally {
        setChaptersLoading(false);
      }
    }

    loadChapters();
  }, []);

  useEffect(() => {
    if (requestedAccessType === "USER" && selectedChapterIds.length > 1) {
      setSelectedChapterIds((current) => current.slice(0, 1));
    }
  }, [requestedAccessType, selectedChapterIds.length]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!chapterPickerRef.current) return;

      if (!chapterPickerRef.current.contains(event.target as Node)) {
        setChapterDropdownOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setChapterDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedChapters = useMemo(
    () =>
      selectedChapterIds
        .map((id) => chapters.find((chapter) => chapter.id === id) ?? null)
        .filter((chapter): chapter is ChapterOption => chapter !== null),
    [chapters, selectedChapterIds]
  );

  const filteredChapters = useMemo(() => {
    const needle = chapterSearch.trim().toLowerCase();
    const selectedSet = new Set(selectedChapterIds);

    const available = chapters.filter((chapter) => !selectedSet.has(chapter.id));

    if (!needle) {
      return available.slice(0, MAX_VISIBLE_CHAPTERS);
    }

    return available
      .filter((chapter) =>
        `${chapter.name} ${chapter.code ?? ""}`.toLowerCase().includes(needle)
      )
      .slice(0, MAX_VISIBLE_CHAPTERS);
  }, [chapters, chapterSearch, selectedChapterIds]);

  function addChapter(chapter: ChapterOption) {
    setSelectedChapterIds((current) => {
      if (requestedAccessType === "USER") {
        return [chapter.id];
      }

      if (current.includes(chapter.id)) {
        return current;
      }

      return [...current, chapter.id];
    });

    setChapterSearch("");
    setChapterDropdownOpen(requestedAccessType === "CHAPTER_ADMIN");
  }

  function removeChapter(chapterId: string) {
    setSelectedChapterIds((current) =>
      current.filter((id) => id !== chapterId)
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (selectedChapterIds.length === 0) {
      setSubmitError("Please select at least one Chapter from the list.");
      return;
    }

    if (requestedAccessType === "USER" && selectedChapterIds.length !== 1) {
      setSubmitError("Member Contractor requests must include exactly one Chapter.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          requestedChapterIds: selectedChapterIds,
          requestedMembershipRole: requestedAccessType,
          comments,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to submit request.");
      }

      setSubmitted(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit request.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(43, 110, 82, 0.25)",
            background: "rgba(43, 110, 82, 0.08)",
            color: "var(--foreground)",
            padding: "16px 18px",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Request submitted
          </div>
          <div style={{ color: "var(--muted-strong)" }}>
            Your access request has been submitted for review. If approved, you
            will receive instructions to activate your account.
          </div>
        </div>

        <div>
          <Link href="/login">Return to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>First Name</span>
          <input
            type="text"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border)",
              padding: "12px 14px",
              background: "white",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Last Name</span>
          <input
            type="text"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border)",
              padding: "12px 14px",
              background: "white",
            }}
          />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border)",
              padding: "12px 14px",
              background: "white",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Phone Number</span>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={14}
            value={phone}
            onChange={(event) => setPhone(formatPhoneNumber(event.target.value))}
            placeholder="(555) 555-5555"
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border)",
              padding: "12px 14px",
              background: "white",
            }}
          />
        </label>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          Requested Access Type
        </span>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <label
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 14,
              background:
                requestedAccessType === "USER" ? "var(--panel-soft)" : "white",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="requestedAccessType"
              checked={requestedAccessType === "USER"}
              onChange={() => setRequestedAccessType("USER")}
              style={{ marginRight: 8 }}
            />
            <strong>Member Contractor</strong>
            <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
              Search, chat with, and download agreements from the national database.
            </div>
          </label>

          <label
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 14,
              background:
                requestedAccessType === "CHAPTER_ADMIN"
                  ? "var(--panel-soft)"
                  : "white",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="requestedAccessType"
              checked={requestedAccessType === "CHAPTER_ADMIN"}
              onChange={() => setRequestedAccessType("CHAPTER_ADMIN")}
              style={{ marginRight: 8 }}
            />
            <strong>Chapter Staff</strong>
            <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
              Manage chapter agreements and chapter-specific access workflows.
            </div>
          </label>
        </div>
      </div>

      <div
        ref={chapterPickerRef}
        style={{ position: "relative", display: "grid", gap: 8 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {requestedAccessType === "CHAPTER_ADMIN" ? "Chapters" : "Chapter"}
          </span>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {requestedAccessType === "CHAPTER_ADMIN"
              ? "Select one or more chapters"
              : "Select exactly one chapter"}
          </span>
        </div>

        <input
          type="text"
          value={chapterSearch}
          onFocus={() => setChapterDropdownOpen(true)}
          onChange={(event) => {
            setChapterSearch(event.target.value);
            setChapterDropdownOpen(true);
          }}
          placeholder={
            chaptersLoading ? "Loading chapters..." : "Start typing chapter name"
          }
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid var(--border)",
            padding: "12px 14px",
            background: "white",
          }}
        />

        {chaptersError ? (
          <div style={{ color: "var(--danger)", fontSize: 13 }}>
            {chaptersError}
          </div>
        ) : null}

        {selectedChapters.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selectedChapters.map((chapter) => (
              <div
                key={chapter.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--panel-soft)",
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span>
                  {chapter.name}
                  {chapter.code ? ` (${chapter.code})` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => removeChapter(chapter.id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 14,
                    lineHeight: 1,
                    color: "var(--muted-strong)",
                  }}
                  aria-label={`Remove ${chapter.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {chapterDropdownOpen ? (
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
              zIndex: 20,
            }}
          >
            {filteredChapters.length > 0 ? (
              filteredChapters.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => addChapter(chapter)}
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
                    {chapter.name}
                  </div>
                  {chapter.code ? (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {chapter.code}
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
                No chapters found.
              </div>
            )}
          </div>
        ) : null}
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Comments</span>
        <textarea
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          rows={5}
          placeholder="Anything the administrator should know about your request"
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid var(--border)",
            padding: "12px 14px",
            background: "white",
            resize: "vertical",
          }}
        />
      </label>

      {submitError ? (
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
          {submitError}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="submit"
          disabled={submitting || chaptersLoading}
          style={{
            border: "none",
            borderRadius: 12,
            padding: "12px 16px",
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
            background: "var(--brand-gradient)",
            color: "white",
          }}
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>

        <Link href="/login">Back to sign in</Link>
      </div>
    </form>
  );
}