"use client";


import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Flag,
  GraduationCap,
  BarChart3,
  Settings,
  BookOpen,
  Bot,
  User,
  Compass,
  CreditCard,
  Bookmark,
  DollarSign,
  Code,
  Newspaper,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { NavItem } from "@/config/nav";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  FileText,
  Flag,
  GraduationCap,
  BarChart3,
  Settings,
  BookOpen,
  Bot,
  User,
  Compass,
  CreditCard,
  Bookmark,
  DollarSign,
  Code,
  Newspaper,
  UserPlus,
};

// Group nav items by logical section based on their nature
function groupNavItems(items: NavItem[]): { label: string; items: NavItem[] }[] {
  const mainItems: NavItem[] = [];
  const contentItems: NavItem[] = [];
  const settingsItems: NavItem[] = [];

  const contentIcons = new Set([
    "FileText",
    "BookOpen",
    "Bot",
    "Flag",
    "Compass",
    "Bookmark",
    "CreditCard",
    "DollarSign",
    "Code",
  ]);
  const settingsIcons = new Set(["Settings", "User"]);

  for (const item of items) {
    if (
      item.title === "Feed" ||
      item.title === "Dashboard" ||
      item.title === "Hub"
    ) {
      mainItems.push(item);
    } else if (settingsIcons.has(item.icon) || item.title === "Profile") {
      settingsItems.push(item);
    } else if (
      contentIcons.has(item.icon) ||
      [
        "Posts",
        "Knowledge Base",
        "Digital Twin",
        "Subscriptions",
        "Bookmarks",
        "Content",
        "Reports",
        "Embed Widget",
        "Pricing",
        "Applications",
      ].includes(item.title)
    ) {
      contentItems.push(item);
    } else {
      mainItems.push(item);
    }
  }

  const groups: { label: string; items: NavItem[] }[] = [];
  if (mainItems.length > 0) groups.push({ label: "Main", items: mainItems });
  if (contentItems.length > 0)
    groups.push({ label: "Content", items: contentItems });
  if (settingsItems.length > 0)
    groups.push({ label: "Settings", items: settingsItems });
  return groups;
}

const roleBadgeMap: Record<string, { label: string; color: string }> = {
  ADMIN: {
    label: "Admin",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  EXPERT: { label: "Expert", color: "bg-primary/10 text-primary" },
  SUBSCRIBER: {
    label: "Subscriber",
    color:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

/* ------------------------------------------------------------------ */
/*  Motion variants (21st.dev hover-sidebar pattern)                  */
/* ------------------------------------------------------------------ */

const sidebarVariants = {
  open: { width: "15rem" },
  closed: { width: "3.05rem" },
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  navItems: NavItem[];
  className?: string;
}

export function Sidebar({ navItems, className }: SidebarProps) {
  const pathname = usePathname();

  const { data: session } = useSession();
  const groups = groupNavItems(navItems);

  const userRole = (session?.user as { role?: string })?.role ?? "";
  const badge = roleBadgeMap[userRole];
  const userName = session?.user?.name ?? "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const isOpen = true;

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={isOpen ? "open" : "closed"}
      initial={false}
      transition={transitionProps}
      className={cn(
        "hidden md:flex flex-col border-r border-border/40 relative overflow-hidden",
        "bg-background/95 dark:bg-background/80",
        "backdrop-blur-xl",
        "font-sans",
        className
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          "relative flex items-center border-b border-border/40 h-16 shrink-0",
          isOpen ? "px-4 gap-3" : "justify-center px-2"
        )}
      >
        <svg
          viewBox="0 0 512 512"
          className="h-7 w-7 shrink-0 rounded-lg"
          aria-hidden="true"
        >
          <rect width="512" height="512" rx="112" fill="currentColor" className="text-primary" />
          <rect x="140" y="128" width="36" height="256" rx="4" fill="hsl(var(--primary-foreground))" />
          <rect x="176" y="128" width="180" height="30" rx="4" fill="hsl(var(--primary-foreground))" />
          <rect x="176" y="225" width="120" height="30" rx="4" fill="hsl(var(--primary-foreground))" />
          <rect
            x="316"
            y="225"
            width="40"
            height="30"
            rx="4"
            fill="hsl(var(--primary-foreground))"
            opacity="0.5"
          />
          <rect x="176" y="354" width="180" height="30" rx="4" fill="hsl(var(--primary-foreground))" />
        </svg>

        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="text-base font-bold tracking-tight whitespace-nowrap text-foreground"
            >
              ExpertHub
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <TooltipProvider delayDuration={0}>
          <motion.nav
            variants={staggerVariants}
            animate={isOpen ? "open" : "closed"}
            className="flex flex-col gap-0.5 px-1.5"
          >
            {groups.map((group, gi) => (
              <div key={group.label}>
                {/* Section label */}
                <AnimatePresence mode="wait">
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                        gi === 0 ? "pb-2 pt-1" : "pb-2 pt-4"
                      )}
                    >
                      {group.label}
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isOpen && gi > 0 && (
                  <div className="mx-2 my-3 h-px bg-border/30" />
                )}

                {group.items.map((item) => {
                  const Icon = iconMap[item.icon] ?? LayoutDashboard;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href + "/"));

                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "group relative flex items-center rounded-md text-sm font-medium cursor-pointer",
                            "min-h-[44px] min-w-[44px]",
                            "transition-colors duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                            isOpen ? "gap-3 px-3" : "justify-center",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          {/* Active left border accent */}
                          {isActive && (
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary"
                            />
                          )}

                          {/* Icon */}
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />

                          {/* Label — hidden when collapsed via overflow */}
                          {isOpen && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15, delay: 0.05 }}
                              className="whitespace-nowrap overflow-hidden"
                            >
                              {item.title}
                            </motion.span>
                          )}
                        </Link>
                      </TooltipTrigger>
                      {!isOpen && (
                        <TooltipContent side="right" className="font-medium">
                          {item.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </motion.nav>
        </TooltipProvider>
      </ScrollArea>

      {/* User section at bottom */}
      {session?.user && (
        <div
          className={cn(
            "border-t border-border/40 shrink-0",
            isOpen ? "p-3" : "p-2 flex justify-center"
          )}
        >
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 rounded-md bg-card p-2.5"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-none">
                  {userName}
                </p>
                {badge && (
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none",
                      badge.color
                    )}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
            </motion.div>
          ) : (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{userName}</p>
                  {badge && (
                    <p className="text-xs text-muted-foreground">
                      {badge.label}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </motion.aside>
  );
}
