import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserTable } from "@/components/admin/user-table";
import { PageTransition, FadeIn } from "@/components/ui/motion";

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <PageTransition className="space-y-8 font-sans">
      {/* Page Header */}
      <FadeIn delay={0.05}>
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-8 py-7">
          {/* Top accent bar */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-[#1E40AF]/60" />

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
              User Management
            </h2>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-slate-500 font-sans">
              Manage all registered users, their roles, and account status.
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <UserTable />
      </FadeIn>
    </PageTransition>
  );
}
