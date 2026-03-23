import { ExpertCard, type Expert } from "./expert-card";

interface ExpertGridProps {
  experts: Expert[];
  className?: string;
}

export function ExpertGrid({ experts, className }: ExpertGridProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className ?? ""}`}
    >
      {experts.map((expert) => (
        <ExpertCard key={expert.id} expert={expert} />
      ))}
    </div>
  );
}
