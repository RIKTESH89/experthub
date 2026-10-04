import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Users,
  ClipboardCheck,
  ShieldCheck,
  FileText,
  Flag,
  Settings,
} from "lucide-react";
import styles from "./admin-studio.module.css";
import { AdminStatCards } from "@/components/admin/admin-stat-cards";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from "@/components/ui/motion";

const quickActions = [
  {
    href: "/admin/users",
    title: "Manage Users",
    description: "View, edit, and manage all users on the platform",
    cta: "View Users",
    icon: Users,
    accent: "bg-primary",
    iconColor: "text-primary",
  },
  {
    href: "/admin/applications",
    title: "Expert Applications",
    description: "Review and approve pending expert applications",
    cta: "Review Applications",
    icon: ClipboardCheck,
    accent: "bg-primary",
    iconColor: "text-primary",
  },
  {
    href: "/admin/experts",
    title: "Manage Experts",
    description: "View expert profiles and manage verification",
    cta: "View Experts",
    icon: ShieldCheck,
    accent: "bg-emerald-500",
    iconColor: "text-emerald-500",
  },
  {
    href: "/admin/content",
    title: "Content Moderation",
    description: "Review and moderate posts across the platform",
    cta: "View Content",
    icon: FileText,
    accent: "bg-amber-500",
    iconColor: "text-amber-500",
  },
  {
    href: "/admin/reports",
    title: "User Reports",
    description: "Review reports submitted by users",
    cta: "View Reports",
    icon: Flag,
    accent: "bg-rose-500",
    iconColor: "text-rose-500",
  },
  {
    href: "/admin/settings",
    title: "Platform Settings",
    description: "Configure platform-wide settings",
    cta: "Settings",
    icon: Settings,
    accent: "bg-secondary0",
    iconColor: "text-muted-foreground",
  },
];

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <PageTransition className="space-y-10 font-sans">
      <header className={styles.overview}>
        <div>
          <p className={styles.eyebrow}>Administration / Knowledge studio</p>
          <h1>Platform operations</h1>
          <p className="text-muted-foreground">Review the people, content, and decisions that keep ExpertHub running.</p>
        </div>
        <aside>
          <p className="font-medium">Welcome, {session.user.name ?? "Admin"}.</p>
          <p className="mt-2 text-muted-foreground">Use the review queues below to manage applications, verification, and moderation.</p>
        </aside>
      </header>

      {/* Stat Cards */}
      <FadeIn delay={0.25}>
        <AdminStatCards />
      </FadeIn>

      {/* Quick Actions */}
      <div className="space-y-4">
        <FadeIn delay={0.35}>
          <h3 className="text-lg font-semibold tracking-tight text-foreground font-sans">
            Quick Actions
          </h3>
        </FadeIn>

        <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <StaggerItem key={action.href}>
                <Link
                  href={action.href}
                  className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/25 hover:shadow-[0_4px_12px_rgba(30,64,175,0.08)]  focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {/* Top accent bar */}
                  <div
                    className={`absolute inset-x-0 top-0 h-[2px] ${action.accent} opacity-60 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none`}
                  />

                  {/* Icon */}
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-card shadow-sm ring-1 ring-border ${action.iconColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold leading-none tracking-tight text-foreground font-sans">
                    {action.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground font-sans">
                    {action.description}
                  </p>

                  {/* CTA */}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors font-sans">
                    {action.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}
