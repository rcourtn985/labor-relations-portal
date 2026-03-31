import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ChapterAccessRequestsClient from "./ChapterAccessRequestsClient";

export default async function ChapterAccessRequestsPage() {
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
        <h1 style={{ margin: 0, marginBottom: 8 }}>
          Chapter Access Requests
        </h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Review Member Contractor requests for your assigned chapter
          memberships only.
        </p>
      </div>

      <ChapterAccessRequestsClient />
    </div>
  );
}