import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { navByRole } from "@/config/nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as string;
  const navItems = navByRole[role] ?? navByRole.SUBSCRIBER;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar navItems={navItems} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top navbar */}
        <Navbar navItems={navItems} />

        {/* Page content */}
        <main className="relative z-0 flex-1 overflow-y-auto bg-dot-pattern">
          {/* Top gradient overlay */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[200px] bg-gradient-to-b from-primary/[0.04] to-transparent"
            aria-hidden="true"
          />

          <div className="relative p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1600px]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
