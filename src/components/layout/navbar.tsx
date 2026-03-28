"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight, Home } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/layout/user-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NavItem } from "@/config/nav";
import { cn } from "@/lib/utils";

interface NavbarProps {
  navItems: NavItem[];
}

/** Map a raw pathname segment to a human-readable label. */
function segmentToLabel(segment: string): string {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Navbar({ navItems }: NavbarProps) {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return [];

    const matchedItem = navItems.find((item) => item.href === pathname);

    const crumbs: { label: string; href: string; isActive: boolean }[] = [];

    if (segments.length >= 1) {
      const roleRoot = `/${segments[0]}`;
      const rootItem = navItems.find((item) => item.href === roleRoot);
      crumbs.push({
        label: rootItem?.title ?? segmentToLabel(segments[0]),
        href: roleRoot,
        isActive: segments.length === 1,
      });
    }

    if (segments.length >= 2) {
      const label =
        matchedItem?.title ?? segmentToLabel(segments[segments.length - 1]);
      crumbs.push({
        label,
        href: pathname,
        isActive: true,
      });
    }

    return crumbs;
  }, [pathname, navItems]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="sticky top-0 z-50 w-full"
    >
      <div
        className={cn(
          "flex h-16 items-center gap-4 px-4 md:px-6",
          "bg-background/80 backdrop-blur-xl",
          "border-b border-border/50"
        )}
      >
        {/* Mobile menu toggle */}
        <MobileNav navItems={navItems} />

        {/* Breadcrumbs */}
        <div className="flex-1 min-w-0">
          <nav
            aria-label="Breadcrumb"
            className="hidden md:flex items-center gap-1.5"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <Home className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            </motion.span>

            {breadcrumbs.map((crumb, index) => (
              <motion.span
                key={crumb.href}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.2,
                  delay: 0.1 + index * 0.06,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="flex items-center gap-1.5 min-w-0"
              >
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <span
                  className={cn(
                    "text-sm truncate transition-colors duration-200",
                    crumb.isActive
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:text-foreground/80 cursor-pointer"
                  )}
                >
                  {crumb.label}
                </span>
              </motion.span>
            ))}
          </nav>

          {/* Mobile: current page title */}
          <div className="md:hidden">
            {breadcrumbs.length > 0 && (
              <motion.p
                key={pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-semibold text-foreground truncate"
              >
                {breadcrumbs[breadcrumbs.length - 1].label}
              </motion.p>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-1 sm:gap-2"
        >
          <NotificationBell />
          <div className="h-4 w-px bg-border/60 mx-0.5 hidden sm:block" />
          <ThemeToggle />
          <div className="h-4 w-px bg-border/60 mx-0.5 hidden sm:block" />
          <UserNav />
        </motion.div>
      </div>
    </motion.header>
  );
}
