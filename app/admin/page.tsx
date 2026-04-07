import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminPageClient from "./AdminPageClient";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isSystemAdmin = (session.user as any).globalRole === "SYSTEM_ADMIN";

  if (!isSystemAdmin) {
    redirect("/");
  }

  return <AdminPageClient />;
}