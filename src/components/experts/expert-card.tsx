import Link from "next/link";
import { BadgeCheck, Users } from "lucide-react";
import { cn, getInitials, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export function ExpertCard({ expert, className }: ExpertCardProps) {
  return (
    <Link href={`/subscriber/experts/${expert.id}`}>
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-primary/5",
          className
        )}
      >
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />

        <CardContent className="relative flex flex-col items-center px-4 pb-4 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
          <Avatar className="h-16 w-16 ring-4 ring-background transition-transform duration-300 group-hover:scale-105">
            <AvatarImage src={expert.image ?? undefined} alt={expert.displayName} />
            <AvatarFallback className="text-lg">
              {getInitials(expert.displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="mt-3 flex items-center gap-1.5">
            <h3 className="text-base font-semibold">{expert.displayName}</h3>
            {expert.isVerified && (
              <BadgeCheck className="h-4 w-4 fill-primary text-primary-foreground" />
            )}
          </div>

          {expert.headline && (
            <p className="mt-1 line-clamp-2 text-center text-xs text-muted-foreground">
              {expert.headline}
            </p>
          )}

          <div className="mt-3 flex flex-wrap justify-center gap-1">
            {(expert.specialty ?? []).slice(0, 3).map((spec) => (
              <Badge
                key={spec}
                variant="secondary"
                className="text-[10px] font-normal"
              >
                {spec}
              </Badge>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{formatNumber(expert._count?.subscribers ?? 0)} subscribers</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
