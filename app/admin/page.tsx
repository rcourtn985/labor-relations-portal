import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AccessRequestsClient from "./access-requests/AccessRequestsClient";
import ActiveUsersClient from "./active-users/ActiveUsersClient";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isSystemAdmin = (session.user as any).globalRole === "SYSTEM_ADMIN";

  if (!isSystemAdmin) {
    redirect("/");
  }

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 20px 40px",
        display: "grid",
        gap: 18,
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
        <h1 style={{ margin: 0, marginBottom: 8 }}>Site Administration</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Review access requests, manage active users, adjust chapter
          assignments, and control account access.
        </p>
      </div>

      <AccessRequestsClient />
      <ActiveUsersClient />
    </div>
  );
}