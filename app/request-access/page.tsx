import { auth } from "@/auth";
import { redirect } from "next/navigation";
import RequestAccessForm from "./RequestAccessForm";

export default async function RequestAccessPage() {
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
          maxWidth: 720,
          border: "1px solid var(--border)",
          borderRadius: 20,
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 28 }}>
          Request Access
        </h1>
        <p style={{ marginTop: 0, marginBottom: 20, color: "var(--muted)" }}>
          Submit your information for administrator review. Once approved, you
          will receive instructions to activate your account.
        </p>

        <RequestAccessForm />
      </div>
    </div>
  );
}