"use client";

import { ExpertCard, type Expert } from "./expert-card";
import { StaggerContainer, StaggerItem } from "@/components/ui/motion";

interface ExpertGridProps {
  experts: Expert[];
  className?: string;
}

export function ExpertGrid({ experts, className }: ExpertGridProps) {
  return (
    <StaggerContainer
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className ?? ""}`}
    >
      {experts.map((expert) => (
        <StaggerItem key={expert.id}>
          <ExpertCard expert={expert} />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
