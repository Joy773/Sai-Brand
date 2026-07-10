import Sidebar from "@/app/components/Sidebar";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-warm-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
