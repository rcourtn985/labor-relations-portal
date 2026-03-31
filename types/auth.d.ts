import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      globalRole: "SYSTEM_ADMIN" | "STANDARD";
      accountStatus: "INVITED" | "ACTIVE" | "DENIED" | "DISABLED";
      memberships: Array<{
        chapterId: string;
        chapterName: string;
        role: "CHAPTER_ADMIN" | "USER";
      }>;
    };
  }

  interface User {
    globalRole: "SYSTEM_ADMIN" | "STANDARD";
    accountStatus: "INVITED" | "ACTIVE" | "DENIED" | "DISABLED";
    memberships: Array<{
      chapterId: string;
      chapterName: string;
      role: "CHAPTER_ADMIN" | "USER";
    }>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    globalRole?: "SYSTEM_ADMIN" | "STANDARD";
    accountStatus?: "INVITED" | "ACTIVE" | "DENIED" | "DISABLED";
    memberships?: Array<{
      chapterId: string;
      chapterName: string;
      role: "CHAPTER_ADMIN" | "USER";
    }>;
  }
}