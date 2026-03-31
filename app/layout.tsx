import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import UserMenu from "@/components/auth/UserMenu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Labor Relations Central Intelligence",
  description: "The source for Labor Relations information.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user ?? null;
  const firstName =
    user?.name?.trim()?.split(/\s+/)[0] ||
    user?.email?.trim()?.split("@")[0] ||
    "User";

  const isSystemAdmin = (user as any)?.globalRole === "SYSTEM_ADMIN";
  const memberships = (((user as any)?.memberships ?? []) as Array<{
    chapterId: string;
    chapterName: string;
    role: "CHAPTER_ADMIN" | "USER";
  }>);

  const isChapterAdmin = memberships.some(
    (membership) => membership.role === "CHAPTER_ADMIN"
  );

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="os-app-shell">
          <header className="os-topbar">
            <div className="os-topbar__brand">Labor Relations Portal</div>

            <div className="os-topbar__actions">
              {user ? (
                <UserMenu
                  firstName={firstName}
                  isSystemAdmin={isSystemAdmin}
                  isChapterAdmin={isChapterAdmin}
                />
              ) : null}
            </div>
          </header>

          <main className="os-app-main">{children}</main>
          <footer className="os-footer">© Overclocked Solutions</footer>
        </div>
      </body>
    </html>
  );
}