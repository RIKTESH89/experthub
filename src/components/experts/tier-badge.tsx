import { Badge } from "@/components/ui/badge";
import { Crown, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tierConfig = {
  FREE: { label: "Free", icon: User, className: "bg-secondary text-secondary-foreground" },
  STANDARD: { label: "Standard", icon: Star, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  PREMIUM: { label: "Premium", icon: Crown, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

export function TierBadge({ tier, className }: { tier: string; className?: string }) {
  const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.FREE;
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={cn("gap-1", config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
