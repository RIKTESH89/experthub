import {
  BadgeCheck,
  Users,
  Globe,
  Twitter,
  Linkedin,
} from "lucide-react";
import { getInitials, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscribeButton } from "./subscribe-button";

interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  website?: string;
}

interface ExpertProfile {
  id: string;
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  specialty: string[];
  image?: string | null;
  isVerified: boolean;
  monthlyPrice: number;
  socialLinks?: SocialLinks | null;
  _count: {
    subscribers: number;
  };
}

interface ExpertProfileHeaderProps {
  expert: ExpertProfile;
  isSubscribed?: boolean;
  isOwnProfile?: boolean;
}

export function ExpertProfileHeader({
  expert,
  isSubscribed = false,
  isOwnProfile = false,
}: ExpertProfileHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Gradient Banner */}
      <div className="h-32 bg-gradient-to-r from-primary/80 via-primary/60 to-primary/30 sm:h-40 md:h-48" />

      <div className="relative bg-card px-4 pb-6 sm:px-6 md:px-8">
        {/* Avatar */}
        <div className="-mt-12 flex flex-col items-start gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg sm:h-28 sm:w-28 md:h-32 md:w-32">
              <AvatarImage src={expert.image ?? undefined} alt={expert.displayName} />
              <AvatarFallback className="text-2xl">
                {getInitials(expert.displayName)}
              </AvatarFallback>
            </Avatar>

            <div className="mb-2 space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl">
                  {expert.displayName}
                </h1>
                {expert.isVerified && (
                  <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground sm:h-6 sm:w-6" />
                )}
              </div>
              {expert.headline && (
                <p className="text-sm text-muted-foreground sm:text-base">
                  {expert.headline}
                </p>
              )}
            </div>
          </div>

          {!isOwnProfile && (
            <div className="ml-auto">
              <SubscribeButton
                expertId={expert.id}
                expertName={expert.displayName}
                monthlyPrice={expert.monthlyPrice}
                isSubscribed={isSubscribed}
              />
            </div>
          )}
        </div>

        {/* Bio */}
        {expert.bio && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {expert.bio}
          </p>
        )}

        {/* Specialty Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(expert.specialty ?? []).map((spec) => (
            <Badge key={spec} variant="secondary">
              {spec}
            </Badge>
          ))}
        </div>

        {/* Stats and Social Links */}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="font-semibold text-foreground">
              {formatNumber(expert._count?.subscribers ?? 0)}
            </span>
            subscribers
          </div>

          {isSubscribed ? (
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              ● Subscribed
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              From{" "}
              <span className="font-semibold text-foreground">Free</span>
            </div>
          )}

          {expert.socialLinks && (
            <div className="ml-auto flex items-center gap-2">
              {expert.socialLinks.twitter && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a
                    href={expert.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {expert.socialLinks.linkedin && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a
                    href={expert.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {expert.socialLinks.website && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a
                    href={expert.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
