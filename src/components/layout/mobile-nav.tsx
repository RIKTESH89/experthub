"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, type LucideIcon, LayoutDashboard, Users, FileText, Flag, GraduationCap, BarChart3, Settings, BookOpen, Bot, User, Compass, CreditCard, Bookmark, Newspaper, UserPlus } from "lucide-react";
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
};

interface MobileNavProps {
  navItems: NavItem[];
}

export function MobileNav({ navItems }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="flex items-center gap-2">
            <svg viewBox="0 0 512 512" className="h-6 w-6 shrink-0 rounded-md" aria-hidden="true">
              <rect width="512" height="512" rx="112" fill="#312E81"/>
              <rect x="140" y="128" width="36" height="256" rx="4" fill="white"/>
              <rect x="176" y="128" width="180" height="30" rx="4" fill="white"/>
              <rect x="176" y="225" width="120" height="30" rx="4" fill="white"/>
              <rect x="316" y="225" width="40" height="30" rx="4" fill="white" opacity="0.5"/>
              <rect x="176" y="354" width="180" height="30" rx="4" fill="white"/>
              <circle cx="378" cy="240" r="8" fill="white" opacity="0.3"/>
              <circle cx="400" cy="240" r="5" fill="white" opacity="0.15"/>
            </svg>
            ExpertHub
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
