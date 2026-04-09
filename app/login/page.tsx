import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--background)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid var(--border)",
          borderRadius: 20,
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 28 }}>Sign in</h1>
        <p style={{ marginTop: 0, marginBottom: 20, color: "var(--muted)" }}>
          Use your approved account credentials to access the portal.
        </p>

        <LoginForm />

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gap: 8,
            fontSize: 14,
            color: "var(--muted)",
          }}
        >
          <div>
            <Link href="/forgot-password">Forgot your password?</Link>
          </div>
          <div>
            Need access? <Link href="/request-access">Request an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}