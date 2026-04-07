"use client";

import Link from "next/link";
import { useState } from "react";

type ActivateAccountFormProps = {
  token: string;
};

export default function ActivateAccountForm({
  token,
}: ActivateAccountFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This activation link is missing its token.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/auth/activate-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to activate account.");
      }

      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to activate account.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
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
            Account activated
          </div>
          <div style={{ color: "var(--muted-strong)" }}>
            Your password has been set and your account is now active.
          </div>
        </div>

        <div>
          <Link href="/login">Continue to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
      {!token ? (
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
          This activation link is invalid.
        </div>
      ) : null}

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>New Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
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
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          Confirm Password
        </span>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid var(--border)",
            padding: "12px 14px",
            background: "white",
          }}
        />
      </label>

      <div style={{ color: "var(--muted)", fontSize: 13 }}>
        Use at least 12 characters.
      </div>

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

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="submit"
          disabled={submitting || !token}
          style={{
            border: "none",
            borderRadius: 12,
            padding: "12px 16px",
            fontWeight: 700,
            cursor: submitting || !token ? "not-allowed" : "pointer",
            opacity: submitting || !token ? 0.7 : 1,
            background: "var(--brand-gradient)",
            color: "white",
          }}
        >
          {submitting ? "Activating..." : "Set Password"}
        </button>

        <Link href="/login">Back to sign in</Link>
      </div>
    </form>
  );
}