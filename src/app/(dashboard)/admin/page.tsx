import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { AdminStatCards } from "@/components/admin/admin-stat-cards";

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <WelcomeBanner userName={session.user.name ?? "Admin"} role="ADMIN" />

      {/* Stat Cards */}
      <AdminStatCards />

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/users" className="group rounded-lg border border-border p-5 transition-all hover:border-primary/30 hover:shadow-sm">
          <h3 className="font-semibold">Manage Users</h3>
          <p className="mt-1 text-sm text-muted-foreground">View, edit, and manage all users on the platform</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
            View Users <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link href="/admin/applications" className="group rounded-lg border border-border p-5 transition-all hover:border-primary/30 hover:shadow-sm">
          <h3 className="font-semibold">Expert Applications</h3>
          <p className="mt-1 text-sm text-muted-foreground">Review and approve pending expert applications</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Review Applications <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link href="/admin/experts" className="group rounded-lg border border-border p-5 transition-all hover:border-primary/30 hover:shadow-sm">
          <h3 className="font-semibold">Manage Experts</h3>
          <p className="mt-1 text-sm text-muted-foreground">View expert profiles and manage verification</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
            View Experts <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link href="/admin/content" className="group rounded-lg border border-border p-5 transition-all hover:border-primary/30 hover:shadow-sm">
          <h3 className="font-semibold">Content Moderation</h3>
          <p className="mt-1 text-sm text-muted-foreground">Review and moderate posts across the platform</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
            View Content <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link href="/admin/reports" className="group rounded-lg border border-border p-5 transition-all hover:border-primary/30 hover:shadow-sm">
          <h3 className="font-semibold">User Reports</h3>
          <p className="mt-1 text-sm text-muted-foreground">Review reports submitted by users</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
            View Reports <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link href="/admin/settings" className="group rounded-lg border border-border p-5 transition-all hover:border-primary/30 hover:shadow-sm">
          <h3 className="font-semibold">Platform Settings</h3>
          <p className="mt-1 text-sm text-muted-foreground">Configure platform-wide settings</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Settings <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
