"use client";

import Link from "next/link";
import { BadgeCheck, Users, ArrowRight } from "lucide-react";
import { cn, getInitials, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "@/components/ui/motion";

export interface Expert {
  id: string;
  displayName: string;
  headline?: string | null;
  specialty: string[];
  image?: string | null;
  isVerified: boolean;
  _count: {
    subscribers: number;
  };
}

interface ExpertCardProps {
  expert: Expert;
  className?: string;
}

const accentGradients: Record<string, { border: string; ring: string }> = {
  blue: {
    border: "border-l-blue-700",
    ring: "ring-blue-700/40",
  },
  emerald: {
    border: "border-l-emerald-500",
    ring: "ring-emerald-500/40",
  },
  amber: {
    border: "border-l-amber-500",
    ring: "ring-amber-500/40",
  },
  rose: {
    border: "border-l-rose-500",
    ring: "ring-rose-500/40",
  },
  cyan: {
    border: "border-l-cyan-500",
    ring: "ring-cyan-500/40",
  },
  slate: {
    border: "border-l-slate-500",
    ring: "ring-slate-500/40",
  },
};

const accentKeys = Object.keys(accentGradients);

function getAccentKey(specialty?: string): string {
  if (!specialty) return accentKeys[0];
  const hash = specialty
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return accentKeys[hash % accentKeys.length];
}

const pillColors = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 ring-1 ring-blue-500/10",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 ring-1 ring-emerald-500/10",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 ring-1 ring-amber-500/10",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 ring-1 ring-rose-500/10",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 ring-1 ring-cyan-500/10",
  "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 ring-1 ring-slate-500/10",
];

function getPillColor(specialty: string): string {
  const hash = specialty
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return pillColors[hash % pillColors.length];
}

export function ExpertCard({ expert, className }: ExpertCardProps) {
  const accentKey = getAccentKey(expert.specialty?.[0]);
  const accent = accentGradients[accentKey];

  return (
    <Link href={`/subscriber/experts/${expert.id}`} className="block h-full cursor-pointer">
      <motion.div
        whileHover={{ y: -3, transition: { duration: 0.2, ease: "easeOut" } }}
        className="h-full"
      >
        <Card
          className={cn(
            "group relative h-full overflow-hidden border-l-4 transition-all duration-200",
            "hover:shadow-md",
            accent.border,
            className
          )}
        >
          <CardContent className="relative flex h-full flex-col gap-3.5 p-4">
            {/* Avatar + Name row */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <Avatar className="h-11 w-11 ring-1 ring-border transition-transform duration-200 group-hover:scale-105">
                  <AvatarImage
                    src={expert.image ?? undefined}
                    alt={expert.displayName}
                  />
                  <AvatarFallback className="text-xs font-semibold font-sans bg-muted">
                    {getInitials(expert.displayName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-semibold font-sans tracking-tight transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                    {expert.displayName}
                  </h3>
                  {expert.isVerified && (
                    <BadgeCheck className="h-4 w-4 shrink-0 fill-blue-700 text-white dark:fill-blue-500" />
                  )}
                </div>
                <p className="line-clamp-1 text-[11px] font-sans text-muted-foreground/80 mt-0.5">
                  {expert.headline || "\u00A0"}
                </p>
              </div>
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
              {(expert.specialty ?? []).slice(0, 2).map((spec) => (
                <span
                  key={spec}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold font-sans tracking-wide uppercase",
                    getPillColor(spec)
                  )}
                >
                  {spec}
                </span>
              ))}
            </div>

            {/* Stats + arrow */}
            <div className="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs font-sans text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">
                  {formatNumber(expert._count?.subscribers ?? 0)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/40 transition-all duration-200 group-hover:text-blue-700/70 group-hover:gap-1.5">
                <span className="text-[10px] font-medium font-sans opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  View
                </span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
