"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

  const filteredChapters = useMemo(() => {
    const needle = chapterSearch.trim().toLowerCase();

    if (!needle) {
      return chapters.slice(0, MAX_VISIBLE_CHAPTERS);
    }

    return chapters
      .filter((chapter) =>
        `${chapter.name} ${chapter.code ?? ""}`.toLowerCase().includes(needle)
      )
      .slice(0, MAX_VISIBLE_CHAPTERS);
  }, [chapters, chapterSearch]);

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId]
  );

  function selectChapter(chapter: ChapterOption) {
    setSelectedChapterId(chapter.id);
    setChapterSearch(chapter.name);
    setChapterDropdownOpen(false);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedChapterId) {
      setSubmitError("Please select your Chapter from the list.");
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
          requestedChapterId: selectedChapterId,
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

      <div style={{ position: "relative", display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Chapter</span>
        <input
          type="text"
          required
          value={chapterSearch}
          onFocus={() => setChapterDropdownOpen(true)}
          onChange={(event) => {
            setChapterSearch(event.target.value);
            setSelectedChapterId("");
            setChapterDropdownOpen(true);
          }}
          placeholder={
            chaptersLoading ? "Loading chapters..." : "Start typing your chapter name"
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
                  onClick={() => selectChapter(chapter)}
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

        {selectedChapter ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Selected: {selectedChapter.name}
            {selectedChapter.code ? ` (${selectedChapter.code})` : ""}
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