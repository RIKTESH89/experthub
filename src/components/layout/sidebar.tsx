"use client";

import { useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Code,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
};

// Group nav items by logical section based on their nature
function groupNavItems(items: NavItem[]): { label: string; items: NavItem[] }[] {
  const mainItems: NavItem[] = [];
  const contentItems: NavItem[] = [];
  const settingsItems: NavItem[] = [];

  const contentIcons = new Set(["FileText", "BookOpen", "Bot", "Flag", "Compass", "Bookmark", "CreditCard", "DollarSign", "Code"]);
  const settingsIcons = new Set(["Settings", "User"]);

  for (const item of items) {
    if (item.title === "Feed" || item.title === "Dashboard" || item.title === "Hub") {
      mainItems.push(item);
    } else if (settingsIcons.has(item.icon) || item.title === "Profile") {
      settingsItems.push(item);
    } else if (contentIcons.has(item.icon) || ["Posts", "Knowledge Base", "Digital Twin", "Subscriptions", "Bookmarks", "Content", "Reports", "Embed Widget", "Pricing"].includes(item.title)) {
      contentItems.push(item);
    } else {
      // Users, Analytics, Experts, Subscribers go to main
      mainItems.push(item);
    }
  }

  const groups: { label: string; items: NavItem[] }[] = [];
  if (mainItems.length > 0) groups.push({ label: "Main", items: mainItems });
  if (contentItems.length > 0) groups.push({ label: "Content", items: contentItems });
  if (settingsItems.length > 0) groups.push({ label: "Settings", items: settingsItems });
  return groups;
}

const roleBadgeMap: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Admin", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  EXPERT: { label: "Expert", color: "bg-primary/10 text-primary" },
  SUBSCRIBER: { label: "Subscriber", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

interface SidebarProps {
  navItems: NavItem[];
  className?: string;
}

export function Sidebar({ navItems, className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border shadow-warm-md bg-sidebar-dots",
        "backdrop-blur-xl bg-background/95 dark:bg-background/80",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center border-b border-border/60 h-16 px-4",
          collapsed ? "justify-center" : "gap-2.5"
        )}
      >
        <svg viewBox="0 0 512 512" className="h-8 w-8 shrink-0 rounded-lg shadow-warm-sm" aria-hidden="true">
          <rect width="512" height="512" rx="112" fill="#312E81"/>
          <rect x="140" y="128" width="36" height="256" rx="4" fill="white"/>
          <rect x="176" y="128" width="180" height="30" rx="4" fill="white"/>
          <rect x="176" y="225" width="120" height="30" rx="4" fill="white"/>
          <rect x="316" y="225" width="40" height="30" rx="4" fill="white" opacity="0.5"/>
          <rect x="176" y="354" width="180" height="30" rx="4" fill="white"/>
          <circle cx="378" cy="240" r="8" fill="white" opacity="0.3"/>
          <circle cx="400" cy="240" r="5" fill="white" opacity="0.15"/>
        </svg>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-gradient">ExpertHub</span>
        )}
      </div>

      {/* Nav Items */}
      <ScrollArea className="flex-1 py-3">
        <TooltipProvider delayDuration={0}>
          <nav className="flex flex-col gap-0.5 px-2">
            {groups.map((group, gi) => (
              <div key={group.label}>
                {/* Section label */}
                {!collapsed && (
                  <div
                    className={cn(
                      "px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60",
                      gi === 0 ? "pb-2 pt-1" : "pb-2 pt-4"
                    )}
                  >
                    {group.label}
                  </div>
                )}
                {collapsed && gi > 0 && (
                  <div className="mx-2 my-3 border-t border-border/40" />
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
                            "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                            "transition-all duration-150",
                            "hover:bg-accent/80 hover:text-accent-foreground",
                            isActive
                              ? "bg-primary/10 text-primary border-l-[3px] border-primary pl-[9px]"
                              : "text-muted-foreground border-l-[3px] border-transparent pl-[9px]",
                            collapsed && "justify-center px-2 pl-2 border-l-0"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right">
                          {item.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* User info section */}
      {session?.user && (
        <div
          className={cn(
            "border-t border-border/60 p-3",
            collapsed ? "flex justify-center" : ""
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 cursor-default">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{userName}</p>
                {badge && <p className="text-xs text-muted-foreground">{badge.label}</p>}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-none">{userName}</p>
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
            </div>
          )}
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="border-t border-border/60 p-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-full hover:bg-accent/80 transition-all duration-150"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
