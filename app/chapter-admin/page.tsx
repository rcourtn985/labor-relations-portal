import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ChapterAdminPageClient from "./ChapterAdminPageClient";

export default async function ChapterAdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const memberships = (((session.user as any).memberships ?? []) as Array<{
    chapterId: string;
    chapterName: string;
    role: "CHAPTER_ADMIN" | "USER";
  }>);

  const adminMemberships = memberships.filter(
    (membership) => membership.role === "CHAPTER_ADMIN"
  );

  if (adminMemberships.length === 0) {
    redirect("/");
  }

  return <ChapterAdminPageClient />;
}