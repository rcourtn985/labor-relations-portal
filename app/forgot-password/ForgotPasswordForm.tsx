"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setResetLink(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to process password reset request.");
      }

      setSuccessMessage(
        data?.message ??
          "If an eligible account exists for that email address, a password reset link has been generated."
      );
      setResetLink(typeof data?.resetLink === "string" ? data.resetLink : null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to process password reset request.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Email Address</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid var(--border)",
            padding: "12px 14px",
            background: "white",
          }}
        />
      </label>

      {error ? (
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
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(43, 110, 82, 0.25)",
            background: "rgba(43, 110, 82, 0.08)",
            color: "var(--foreground)",
            padding: "12px 14px",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 700 }}>{successMessage}</div>

          {resetLink ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: "var(--muted-strong)", fontSize: 14 }}>
                Development reset link:
              </div>
              <a
                href={resetLink}
                style={{
                  color: "var(--accent)",
                  wordBreak: "break-all",
                  fontSize: 14,
                }}
              >
                {resetLink}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={submitting}
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
          {submitting ? "Submitting..." : "Send Reset Link"}
        </button>

        <Link href="/login">Back to sign in</Link>
      </div>
    </form>
  );
}