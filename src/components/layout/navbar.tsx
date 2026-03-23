"use client";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/layout/user-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NavItem } from "@/config/nav";

interface NavbarProps {
  navItems: NavItem[];
}

export function Navbar({ navItems }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {/* Mobile menu toggle */}
      <MobileNav navItems={navItems} />

      {/* Breadcrumbs placeholder */}
      <div className="flex-1">
        <nav aria-label="Breadcrumb" className="hidden md:block">
          {/* Breadcrumbs can be injected here */}
        </nav>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
