"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  children,
  className,
}: ChartCardProps) {
  return (
    <FadeIn duration={0.3}>
      <Card
        className={cn(
          "group relative overflow-hidden border-border/50",
          "hover:shadow-md transition-shadow duration-200",
          className
        )}
      >
        <CardHeader className="space-y-1.5 pb-2">
          <CardTitle className="text-base font-semibold font-sans tracking-tight text-foreground">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-[13px] font-sans leading-relaxed text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </FadeIn>
  );
}
