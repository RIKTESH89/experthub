"use client";

import Link from "next/link";
import { BadgeCheck, Users, ArrowRight } from "lucide-react";
import { cn, getInitials, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export function ExpertCard({ expert, className }: ExpertCardProps) {
  return <Link href={`/subscriber/experts/${expert.id}`} className={cn("group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary focus-visible:border-primary", className)}>
    <div className="flex items-start gap-4">
      <Avatar className="h-12 w-12 shrink-0 border border-border"><AvatarImage src={expert.image ?? undefined} alt={expert.displayName}/><AvatarFallback className="bg-muted text-base text-primary">{getInitials(expert.displayName)}</AvatarFallback></Avatar>
      <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="text-lg font-medium leading-snug group-hover:text-primary">{expert.displayName}</h3>{expert.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified expert"/>}</div>{expert.headline && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{expert.headline}</p>}</div>
    </div>
    <div className="mt-5 flex flex-wrap gap-2">{(expert.specialty ?? []).slice(0,2).map(spec=><span key={spec} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{spec}</span>)}</div>
    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-muted-foreground">{expert._count?.subscribers !== undefined && <span className="flex items-center gap-2"><Users size={16}/>{formatNumber(expert._count.subscribers)} subscribers</span>}<span className="flex items-center gap-2 text-primary">View profile <ArrowRight size={16}/></span></div>
  </Link>;
}
