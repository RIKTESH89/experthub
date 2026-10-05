"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Menu,
  type LucideIcon,
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
  Newspaper,
  UserPlus,
  DollarSign,
  Code,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Newspaper,
  UserPlus,
  DollarSign,
  Code,
};

const roleBadgeMap: Record<string, { label: string; color: string }> = {
  ADMIN: {
    label: "Admin",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20",
  },
  EXPERT: {
    label: "Expert",
    color: "bg-primary/10 text-primary ring-primary/20",
  },
  SUBSCRIBER: {
    label: "Subscriber",
    color:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  },
};

interface MobileNavProps {
  navItems: NavItem[];
}

export function MobileNav({ navItems }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  const userRole = (session?.user as { role?: string })?.role ?? "";
  const badge = roleBadgeMap[userRole];
  const userName = session?.user?.name ?? "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-11 w-11 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className={cn(
          "w-[280px] p-0 border-r border-border/50",
          "bg-background/80 backdrop-blur-xl"
        )}
      >
        {/* Header */}
        <SheetHeader className="border-b border-border/50 px-5 py-5">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <svg
                viewBox="0 0 512 512"
                className="h-5 w-5 shrink-0"
                aria-hidden="true"
              >
                <rect
                  x="140"
                  y="128"
                  width="36"
                  height="256"
                  rx="4"
                  fill="hsl(var(--primary-foreground))"
                />
                <rect
                  x="176"
                  y="128"
                  width="180"
                  height="30"
                  rx="4"
                  fill="hsl(var(--primary-foreground))"
                />
                <rect
                  x="176"
                  y="225"
                  width="120"
                  height="30"
                  rx="4"
                  fill="hsl(var(--primary-foreground))"
                />
                <rect
                  x="316"
                  y="225"
                  width="40"
                  height="30"
                  rx="4"
                  fill="hsl(var(--primary-foreground))"
                  opacity="0.5"
                />
                <rect
                  x="176"
                  y="354"
                  width="180"
                  height="30"
                  rx="4"
                  fill="hsl(var(--primary-foreground))"
                />
                <circle cx="378" cy="240" r="8" fill="hsl(var(--primary-foreground))" opacity="0.3" />
                <circle cx="400" cy="240" r="5" fill="hsl(var(--primary-foreground))" opacity="0.15" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight">
                ExpertHub
              </span>
              {badge && (
                <span
                  className={cn(
                    "mt-0.5 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ring-1",
                    badge.color
                  )}
                >
                  {badge.label}
                </span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <nav className="flex flex-col gap-1 p-3">
            <AnimatePresence mode="wait">
              {navItems.map((item, index) => {
                const Icon = iconMap[item.icon] ?? LayoutDashboard;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href + "/"));

                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: index * 0.04,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium cursor-pointer",
                        "min-h-[44px]",
                        "transition-colors duration-200",
                        "hover:bg-accent",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {/* Active background */}
                      {isActive && (
                        <motion.div
                          layoutId="mobile-nav-active"
                          className="absolute inset-0 rounded-lg bg-primary/[0.08]"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                        />
                      )}

                      {/* Active left accent */}
                      {isActive && (
                        <motion.div
                          layoutId="mobile-nav-accent"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                        />
                      )}

                      <div
                        className={cn(
                          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                          isActive
                            ? "bg-primary/10"
                            : "bg-card group-hover:bg-accent"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] transition-colors duration-200",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                      </div>

                      <span className="relative">{item.title}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </nav>
        </ScrollArea>

        {/* User Footer */}
        {session?.user && (
          <div className="absolute inset-x-0 bottom-0 border-t border-border/50 bg-background/80 backdrop-blur-xl p-3">
            <div className="flex items-center gap-3 rounded-lg bg-card p-2.5">
              <Avatar className="h-8 w-8 ring-1 ring-border/50">
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
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ring-1",
                      badge.color
                    )}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
