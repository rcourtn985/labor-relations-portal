import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type ChapterMembershipForSession = {
  chapterId: string;
  chapterName: string;
  role: "CHAPTER_ADMIN" | "USER";
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            chapterMemberships: {
              where: { isActive: true },
              include: {
                chapter: true,
              },
            },
          },
        });

        if (!user) {
          return null;
        }

        if (user.deletedAt) {
          return null;
        }

        if (user.accountStatus !== "ACTIVE") {
          return null;
        }

        if (!user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        const memberships: ChapterMembershipForSession[] =
          user.chapterMemberships
            .filter(
              (membership) =>
                Boolean(membership.chapter) && !membership.chapter?.deletedAt
            )
            .map((membership) => ({
              chapterId: membership.chapterId,
              chapterName: membership.chapter?.name ?? "",
              role: membership.role,
            }));

        return {
          id: user.id,
          email: user.email,
          name:
            user.name?.trim() ||
            [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
            user.email,
          globalRole: user.globalRole,
          accountStatus: user.accountStatus,
          memberships,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).id;
        token.globalRole = (user as any).globalRole;
        token.accountStatus = (user as any).accountStatus;
        token.memberships = (user as any).memberships ?? [];
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).globalRole = token.globalRole;
        (session.user as any).accountStatus = token.accountStatus;
        (session.user as any).memberships = token.memberships ?? [];
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}