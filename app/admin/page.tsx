import { redirect } from "next/navigation";
import AdminLogin from "@/app/components/AdminLogin";
import { auth } from "@/app/auth";

export const metadata = {
  title: "Admin | German Care",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const session = await auth();

  if (session?.user?.role === "admin") {
    redirect("/admin/dashboard");
  }

  return <AdminLogin />;
}
