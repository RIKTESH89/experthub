import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscoverSectionProps {
  title: string;
  description?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  children: ReactNode;
  className?: string;
}

export function DiscoverSection({
  title,
  description,
  seeAllHref,
  seeAllLabel = "See all",
  children,
  className,
}: DiscoverSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="group flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            {seeAllLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
