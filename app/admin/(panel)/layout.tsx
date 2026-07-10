import { redirect } from "next/navigation";
import AdminShell from "@/app/components/AdminShell";
import { auth } from "@/app/auth";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    redirect("/admin");
  }

  return <AdminShell>{children}</AdminShell>;
}
