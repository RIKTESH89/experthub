"use client";

import {
  BadgeCheck,
  Users,
  Globe,
  Twitter,
  Linkedin,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscribeButton } from "./subscribe-button";
import { FadeIn, AnimatedCounter } from "@/components/ui/motion";

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
    <div className="relative border-b border-border">
      <div className="relative bg-card px-5 py-8 sm:px-8">
        {/* Avatar + Name + Subscribe */}
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4 sm:gap-5">
            <FadeIn delay={0.1} direction="up">
              <div className="relative rounded-full border-4 border-card">
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32">
                  <AvatarImage src={expert.image ?? undefined} alt={expert.displayName} />
                  <AvatarFallback className="text-2xl font-bold font-sans bg-muted">
                    {getInitials(expert.displayName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </FadeIn>

            <FadeIn delay={0.15} direction="up">
              <div className="mb-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold font-sans tracking-tight sm:text-xl md:text-2xl lg:text-3xl">
                    {expert.displayName}
                  </h1>
                  {expert.isVerified && (
                    <BadgeCheck className="h-5 w-5 fill-blue-700 text-white sm:h-6 sm:w-6 dark:fill-blue-500" />
                  )}
                </div>
                {expert.headline && (
                  <p className="text-sm font-sans text-muted-foreground sm:text-base max-w-md">
                    {expert.headline}
                  </p>
                )}
              </div>
            </FadeIn>
          </div>

          {!isOwnProfile && (
            <FadeIn delay={0.2} direction="up">
              <div className="ml-auto">
                <SubscribeButton
                  expertId={expert.id}
                  expertName={expert.displayName}
                  monthlyPrice={expert.monthlyPrice}
                  isSubscribed={isSubscribed}
                />
              </div>
            </FadeIn>
          )}
        </div>

        {/* Bio */}
        {expert.bio && (
          <FadeIn delay={0.25} direction="up">
            <p className="mt-5 max-w-2xl text-sm font-sans leading-relaxed text-foreground">
              {expert.bio}
            </p>
          </FadeIn>
        )}

        {/* Specialty Badges */}
        <FadeIn delay={0.3} direction="up">
          <div className="mt-5 flex flex-wrap gap-2">
            {(expert.specialty ?? []).map((spec) => (
              <Badge
                key={spec}
                variant="secondary"
                className="rounded-full px-3 py-1 text-xs font-medium font-sans transition-colors duration-200 hover:bg-primary/10 hover:text-primary dark:hover:text-primary"
              >
                {spec}
              </Badge>
            ))}
          </div>
        </FadeIn>

        {/* Stats and Social Links */}
        <FadeIn delay={0.35} direction="up">
          <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-border/60 pt-5">
            <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                <Users className="h-4 w-4 text-primary dark:text-primary" />
              </div>
              <div className="flex items-baseline gap-1">
                <AnimatedCounter
                  value={expert._count?.subscribers ?? 0}
                  className="font-bold text-foreground text-base font-sans"
                  duration={1}
                />
                <span className="text-xs font-sans text-muted-foreground">subscribers</span>
              </div>
            </div>

            {isSubscribed ? (
              <div className="flex items-center gap-1.5 text-sm font-medium font-sans text-green-600 dark:text-green-400">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Subscribed
              </div>
            ) : (
              <div className="text-sm font-sans text-muted-foreground">
                Review available plans
              </div>
            )}

            {expert.socialLinks && (
              <div className="ml-auto flex items-center gap-1.5">
                {expert.socialLinks.twitter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 cursor-pointer rounded-full hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                    asChild
                  >
                    <a
                      aria-label="Expert on X"
                      href={expert.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {expert.socialLinks.linkedin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 cursor-pointer rounded-full hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                    asChild
                  >
                    <a
                      aria-label="Expert on LinkedIn"
                      href={expert.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {expert.socialLinks.website && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 cursor-pointer rounded-full hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                    asChild
                  >
                    <a
                      aria-label="Expert website"
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
        </FadeIn>
      </div>
    </div>
  );
}
