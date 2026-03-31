import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const displayName = session.user.name || session.user.email || "User";

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "32px 20px 40px",
      }}
    >
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 20,
          background: "var(--panel)",
          boxShadow: "var(--shadow-soft)",
          padding: 24,
        }}
      >
        <h1 style={{ marginBottom: 8 }}>Profile</h1>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          This page is a placeholder for the future profile experience.
        </p>

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gap: 12,
          }}
        >
          <div>
            <strong>Name:</strong> {displayName}
          </div>
          <div>
            <strong>Email:</strong> {session.user.email || "—"}
          </div>
          <div>
            <strong>Role:</strong>{" "}
            {(session.user as any).globalRole === "SYSTEM_ADMIN"
              ? "System Admin"
              : "Authenticated User"}
          </div>
        </div>
      </div>
    </div>
  );
}