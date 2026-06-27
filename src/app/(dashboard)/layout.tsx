import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ensureDbConnection } from "@/lib/db-connection";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  try {
    await ensureDbConnection();
  } catch {
    // Allow child routes to surface their own retry/error UI.
  }

  return <DashboardShell>{children}</DashboardShell>;
}
