import Link from "next/link";
import { ArrowRight, BadgeCheck, Users } from "lucide-react";
import { cn, getInitials, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

function getAccentColor(specialty?: string): string {
  const colors = [
    "border-l-indigo-500",
    "border-l-emerald-500",
    "border-l-amber-500",
    "border-l-rose-500",
    "border-l-cyan-500",
    "border-l-violet-500",
  ];
  if (!specialty) return colors[0];
  const hash = specialty
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

const pillColors = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
];

function getPillColor(specialty: string): string {
  const hash = specialty
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return pillColors[hash % pillColors.length];
}

export function ExpertCard({ expert, className }: ExpertCardProps) {
  const accentColor = getAccentColor(expert.specialty?.[0]);

  return (
    <Link href={`/subscriber/experts/${expert.id}`}>
      <Card
        className={cn(
          "group relative overflow-hidden border-l-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
          "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-primary/20 before:to-transparent",
          accentColor,
          className
        )}
      >
        {/* Decorative expertise SVG */}
        <svg
          className="absolute right-2 top-2 h-5 w-5 text-primary/10 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>

        <CardContent className="flex flex-col gap-3 p-3">
          {/* Avatar + Name row */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-10 w-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
              <AvatarImage
                src={expert.image ?? undefined}
                alt={expert.displayName}
              />
              <AvatarFallback className="text-xs">
                {getInitials(expert.displayName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h3 className="truncate text-sm font-semibold">
                  {expert.displayName}
                </h3>
                {expert.isVerified && (
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-primary text-primary-foreground" />
                )}
              </div>
              {expert.headline && (
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {expert.headline}
                </p>
              )}
            </div>
          </div>

          {/* Specialties */}
          <div className="flex flex-wrap gap-1">
            {(expert.specialty ?? []).slice(0, 2).map((spec) => (
              <span
                key={spec}
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                  getPillColor(spec)
                )}
              >
                {spec}
              </span>
            ))}
          </div>

          {/* Stats + button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{formatNumber(expert._count?.subscribers ?? 0)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 sm:px-3"
              tabIndex={-1}
            >
              <span className="hidden sm:inline">View Profile</span>
              <ArrowRight className="h-3.5 w-3.5 sm:hidden" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
