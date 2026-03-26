"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bot, Crown, Star, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpertProfileHeader } from "@/components/experts/expert-profile-header";
import { PostFeed } from "@/components/posts/post-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ExpertDetail {
  id: string;
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  specialty: string[];
  image?: string | null;
  isVerified: boolean;
  monthlyPrice: number;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  } | null;
  _count: {
    subscribers: number;
    posts: number;
  };
  isSubscribed: boolean;
}

interface PricingTier {
  id: string;
  tier: "FREE" | "STANDARD" | "PREMIUM";
  price: number;
  description?: string | null;
  monthlyQuestions?: number | null;
  features: string[];
}

const tierIcons = {
  FREE: User,
  STANDARD: Star,
  PREMIUM: Crown,
};

const tierLabels = {
  FREE: "Free",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

export default function SubscriberExpertProfilePage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchExpert() {
      try {
        const [expertRes, pricingRes] = await Promise.all([
          fetch(`/api/experts/${expertId}`),
          fetch(`/api/experts/${expertId}/pricing`),
        ]);

        if (expertRes.ok) {
          const data = await expertRes.json();
          setExpert(data);
        } else {
          throw new Error("Failed to fetch");
        }

        if (pricingRes.ok) {
          const pricingData = await pricingRes.json();
          const tiers: PricingTier[] = pricingData.tiers ?? [];
          const tierOrder = ["FREE", "STANDARD", "PREMIUM"];
          tiers.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
          setPricingTiers(tiers);
        }
      } catch {
        toast.error("Failed to load expert profile");
      } finally {
        setIsLoading(false);
      }
    }
    fetchExpert();
  }, [expertId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold">Expert Not Found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This expert profile does not exist.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/subscriber/hub">Browse Experts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <ExpertProfileHeader
        expert={expert}
        isSubscribed={expert.isSubscribed}
      />

      {/* Floating Chat Button */}
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
        {expert.isSubscribed ? (
          <Button size="lg" className="gap-2 rounded-full shadow-lg text-sm sm:text-base" asChild>
            <Link href={`/subscriber/experts/${expertId}/chat`}>
              <Bot className="h-5 w-5" />
              Ask Digital Twin
            </Link>
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            className="gap-2 rounded-full shadow-lg text-sm sm:text-base"
            asChild
          >
            <Link href={`/subscriber/experts/${expertId}/chat`}>
              <Bot className="h-5 w-5" />
              Try Digital Twin Free
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">
            Posts ({expert._count.posts})
          </TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          <PostFeed
            endpoint={`/api/posts?authorId=${expertId}&status=PUBLISHED`}
            emptyTitle="No posts yet"
            emptyDescription="This expert hasn't published any posts yet."
          />
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <div className="space-y-6">
            {/* Bio */}
            {expert.bio && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">About</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {expert.bio}
                </p>
              </div>
            )}

            {/* Expertise Areas */}
            {(expert.specialty ?? []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Expertise Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {(expert.specialty ?? []).map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-sm">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {expert.socialLinks &&
              (expert.socialLinks.twitter ||
                expert.socialLinks.linkedin ||
                expert.socialLinks.website) && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Connect</h3>
                  <div className="flex flex-col gap-2">
                    {expert.socialLinks.twitter && (
                      <a
                        href={expert.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Twitter / X
                      </a>
                    )}
                    {expert.socialLinks.linkedin && (
                      <a
                        href={expert.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        LinkedIn
                      </a>
                    )}
                    {expert.socialLinks.website && (
                      <a
                        href={expert.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              )}

            {/* Pricing Tiers */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Plans</h3>
              {pricingTiers.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pricingTiers.map((t) => {
                    const Icon = tierIcons[t.tier] || User;
                    const isPremium = t.tier === "PREMIUM";
                    return (
                      <div
                        key={t.tier}
                        className={cn(
                          "relative rounded-lg border p-4",
                          isPremium ? "border-primary bg-primary/[0.03]" : "border-border"
                        )}
                      >
                        {isPremium && (
                          <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                            Popular
                          </Badge>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              t.tier === "FREE" && "text-muted-foreground",
                              t.tier === "STANDARD" && "text-blue-500",
                              t.tier === "PREMIUM" && "text-amber-500"
                            )}
                          />
                          <span className="text-sm font-semibold">{tierLabels[t.tier]}</span>
                        </div>
                        <p className="text-xl font-bold">
                          {t.price > 0 ? `$${t.price.toFixed(2)}` : "Free"}
                          {t.price > 0 && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                        </p>
                        {t.features.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {t.features.map((feature, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <span className="text-2xl font-bold text-foreground">
                    ${(expert.monthlyPrice ?? 0).toFixed(2)}
                  </span>
                  /month
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
