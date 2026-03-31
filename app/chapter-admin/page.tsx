import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ChapterAdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const memberships = ((session.user as any).memberships ?? []) as Array<{
    chapterId: string;
    chapterName: string;
    role: "CHAPTER_ADMIN" | "USER";
  }>;

  const adminMemberships = memberships.filter(
    (membership) => membership.role === "CHAPTER_ADMIN"
  );

  if (adminMemberships.length === 0) {
    redirect("/");
  }

  return (
    <div
      style={{
        maxWidth: 1000,
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
        <h1 style={{ margin: 0, marginBottom: 8 }}>Chapter Administration</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Review Member Contractor access requests for your assigned chapter
          memberships.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <Link
          href="/chapter-admin/access-requests"
          style={{
            border: "1px solid var(--border)",
            borderRadius: 18,
            background: "var(--panel)",
            boxShadow: "var(--shadow-soft)",
            padding: 20,
            color: "var(--foreground)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            Access Requests
          </div>
          <div style={{ color: "var(--muted)" }}>
            Review pending Member Contractor requests for your chapter.
          </div>
        </Link>
      </div>
    </div>
  );
}