"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (!result || result.error) {
        setErrorMessage("Invalid email or password.");
        return;
      }

      window.location.href = result.url || "/";
    } catch {
      setErrorMessage("Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
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
        <span style={{ fontWeight: 700, fontSize: 14 }}>Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid var(--border)",
            padding: "12px 14px",
            background: "white",
          }}
        />
      </label>

      {errorMessage && (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(192, 57, 43, 0.25)",
            background: "rgba(192, 57, 43, 0.08)",
            color: "#8e2b21",
            padding: "10px 12px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: 8,
          border: "none",
          borderRadius: 12,
          padding: "12px 16px",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          background: "var(--brand-gradient)",
          color: "white",
        }}
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}