import { auth } from "@/auth";

type SessionLike = Awaited<ReturnType<typeof auth>>;
type SessionMembership = {
  chapterId: string;
  chapterName: string;
  role: "CHAPTER_ADMIN" | "USER";
};

export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return session;
}

export function isSystemAdmin(session: SessionLike): boolean {
  return session?.user?.globalRole === "SYSTEM_ADMIN";
}

export function getActiveChapterAdminChapterIds(session: SessionLike): string[] {
  const memberships = (session?.user?.memberships ?? []) as SessionMembership[];

  return memberships
    .filter((membership) => membership.role === "CHAPTER_ADMIN")
    .map((membership) => membership.chapterId);
}

export function getUserChapterIds(session: SessionLike): string[] {
  const memberships = (session?.user?.memberships ?? []) as SessionMembership[];

  return memberships.map((membership) => membership.chapterId);
}