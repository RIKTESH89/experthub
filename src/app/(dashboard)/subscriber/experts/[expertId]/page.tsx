"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bot, Crown, Star, User, Check, Globe, Twitter, Linkedin, ExternalLink } from "lucide-react";
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
import {
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
  motion,
} from "@/components/ui/motion";

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

const tierGradients = {
  FREE: "from-slate-500/10 to-slate-300/5",
  STANDARD: "from-[#1E40AF]/10 to-blue-300/5",
  PREMIUM: "from-amber-500/10 to-yellow-300/5",
};

const tierBorderColors = {
  FREE: "border-border dark:border-border",
  STANDARD: "border-[#1E40AF]/20 dark:border-blue-800",
  PREMIUM: "border-amber-300 dark:border-amber-700",
};

const tierIconColors = {
  FREE: "text-muted-foreground",
  STANDARD: "text-[#1E40AF]",
  PREMIUM: "text-amber-500",
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

          // If subscription exists but not active, check if there's a PENDING payment to verify
          if (!data.isSubscribed && data.subscription?.razorpaySubscriptionId && data.subscription?.status === "PENDING") {
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ razorpaySubscriptionId: data.subscription.razorpaySubscriptionId }),
              });
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                if (verifyData.verified) {
                  // Re-fetch expert data with updated subscription status
                  const refreshRes = await fetch(`/api/experts/${expertId}`);
                  if (refreshRes.ok) {
                    const refreshData = await refreshRes.json();
                    setExpert(refreshData);
                  } else {
                    setExpert(data);
                  }
                } else {
                  setExpert(data);
                }
              } else {
                setExpert(data);
              }
            } catch {
              setExpert(data);
            }
          } else {
            setExpert(data);
          }
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
      <div className="space-y-6 font-sans">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!expert) {
    return (
      <FadeIn className="flex flex-col items-center justify-center py-16 font-sans">
        <div className="rounded-full bg-muted p-6 mb-4">
          <User className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Expert Not Found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This expert profile does not exist.
        </p>
        <Button className="mt-4 cursor-pointer" asChild>
          <Link href="/subscriber/hub">Browse Experts</Link>
        </Button>
      </FadeIn>
    );
  }

  return (
    <PageTransition className="space-y-6 font-sans">
      {/* Profile Header */}
      <FadeIn delay={0.05}>
        <ExpertProfileHeader
          expert={expert}
          isSubscribed={expert.isSubscribed}
        />
      </FadeIn>

      {/* Floating Chat Button */}
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        >
          {expert.isSubscribed ? (
            <Button
              size="lg"
              className="gap-2 rounded-full shadow-lg text-sm sm:text-base bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white border-0 cursor-pointer"
              asChild
            >
              <Link href={`/subscriber/experts/${expertId}/chat`}>
                <Bot className="h-5 w-5" />
                Ask Digital Twin
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              className="gap-2 rounded-full shadow-lg text-sm sm:text-base bg-background border-[#1E40AF]/20 hover:border-[#1E40AF]/40 hover:bg-[#1E40AF]/5 cursor-pointer"
              asChild
            >
              <Link href={`/subscriber/experts/${expertId}/chat`}>
                <Bot className="h-5 w-5 text-[#1E40AF]" />
                Try Digital Twin Free
              </Link>
            </Button>
          )}
        </motion.div>
      </div>

      {/* Tabs */}
      <FadeIn delay={0.15}>
        <Tabs defaultValue="posts">
          <TabsList className="w-full justify-start border-b bg-transparent p-0 h-auto rounded-none">
            <TabsTrigger
              value="posts"
              className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all duration-200 data-[state=active]:border-[#1E40AF] data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent hover:text-foreground/80 cursor-pointer"
            >
              Posts
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] font-semibold">
                {expert._count.posts}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground transition-all duration-200 data-[state=active]:border-[#1E40AF] data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent hover:text-foreground/80 cursor-pointer"
            >
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <FadeIn delay={0.1}>
              <PostFeed
                endpoint={`/api/posts?authorId=${expertId}&status=PUBLISHED`}
                emptyTitle="No posts yet"
                emptyDescription="This expert hasn't published any posts yet."
              />
            </FadeIn>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <StaggerContainer className="space-y-8">
              {/* Bio */}
              {expert.bio && (
                <StaggerItem>
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold tracking-tight font-sans">About</h3>
                    <div className="rounded-xl border bg-card p-5">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {expert.bio}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              )}

              {/* Expertise Areas */}
              {(expert.specialty ?? []).length > 0 && (
                <StaggerItem>
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold tracking-tight font-sans">Expertise Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {(expert.specialty ?? []).map((spec) => (
                        <Badge
                          key={spec}
                          variant="secondary"
                          className="text-sm px-3 py-1 bg-[#1E40AF]/5 text-[#1E40AF] border border-[#1E40AF]/10 hover:bg-[#1E40AF]/10 transition-colors duration-200"
                        >
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </StaggerItem>
              )}

              {/* Social Links */}
              {expert.socialLinks &&
                (expert.socialLinks.twitter ||
                  expert.socialLinks.linkedin ||
                  expert.socialLinks.website) && (
                  <StaggerItem>
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold tracking-tight font-sans">Connect</h3>
                      <div className="flex flex-wrap gap-3">
                        {expert.socialLinks.twitter && (
                          <a
                            href={expert.socialLinks.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:border-[#1E40AF]/30 hover:bg-[#1E40AF]/5 hover:text-foreground cursor-pointer"
                          >
                            <Twitter className="h-4 w-4 text-[#1DA1F2] group-hover:scale-110 transition-transform duration-200" />
                            Twitter / X
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </a>
                        )}
                        {expert.socialLinks.linkedin && (
                          <a
                            href={expert.socialLinks.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:border-[#1E40AF]/30 hover:bg-[#1E40AF]/5 hover:text-foreground cursor-pointer"
                          >
                            <Linkedin className="h-4 w-4 text-[#0A66C2] group-hover:scale-110 transition-transform duration-200" />
                            LinkedIn
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </a>
                        )}
                        {expert.socialLinks.website && (
                          <a
                            href={expert.socialLinks.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:border-[#1E40AF]/30 hover:bg-[#1E40AF]/5 hover:text-foreground cursor-pointer"
                          >
                            <Globe className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform duration-200" />
                            Website
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </a>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                )}

              {/* Pricing Tiers */}
              <StaggerItem>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold tracking-tight font-sans">Plans</h3>
                  {pricingTiers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {pricingTiers.map((t, index) => {
                        const Icon = tierIcons[t.tier] || User;
                        const isPremium = t.tier === "PREMIUM";
                        return (
                          <motion.div
                            key={t.tier}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index, duration: 0.3 }}
                            className="relative"
                          >
                            {/* Border accent for premium */}
                            {isPremium && (
                              <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-400 opacity-75 blur-[1px]" />
                            )}
                            <div
                              className={cn(
                                "relative rounded-xl border p-5 bg-card transition-shadow duration-200 hover:shadow-md",
                                isPremium
                                  ? "border-transparent"
                                  : tierBorderColors[t.tier]
                              )}
                            >
                              {/* Tier background */}
                              <div
                                className={cn(
                                  "absolute inset-0 rounded-xl bg-gradient-to-br opacity-50",
                                  tierGradients[t.tier]
                                )}
                              />

                              <div className="relative">
                                {isPremium && (
                                  <Badge className="absolute -top-8 left-1/2 -translate-x-1/2 bg-amber-500 text-white border-0 text-[10px] shadow-md">
                                    Most Popular
                                  </Badge>
                                )}

                                <div className="flex items-center gap-2.5 mb-3">
                                  <div
                                    className={cn(
                                      "flex h-9 w-9 items-center justify-center rounded-lg",
                                      t.tier === "FREE" && "bg-muted dark:bg-slate-800",
                                      t.tier === "STANDARD" && "bg-[#1E40AF]/10 dark:bg-blue-900/30",
                                      t.tier === "PREMIUM" && "bg-amber-100 dark:bg-amber-900/30"
                                    )}
                                  >
                                    <Icon className={cn("h-4.5 w-4.5", tierIconColors[t.tier])} />
                                  </div>
                                  <span className="text-sm font-bold tracking-tight font-sans">
                                    {tierLabels[t.tier]}
                                  </span>
                                </div>

                                <div className="mb-4">
                                  <p className="text-3xl font-extrabold tracking-tight font-sans">
                                    {t.price > 0 ? `₹${t.price.toFixed(2)}` : "Free"}
                                  </p>
                                  {t.price > 0 && (
                                    <span className="text-xs font-medium text-muted-foreground">
                                      per month
                                    </span>
                                  )}
                                </div>

                                {t.description && (
                                  <p className="text-xs text-muted-foreground mb-3">
                                    {t.description}
                                  </p>
                                )}

                                {t.features.length > 0 && (
                                  <ul className="space-y-2">
                                    {t.features.map((feature, i) => (
                                      <li
                                        key={i}
                                        className="flex items-start gap-2 text-xs text-muted-foreground"
                                      >
                                        <div
                                          className={cn(
                                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                                            t.tier === "FREE" && "bg-muted dark:bg-slate-800",
                                            t.tier === "STANDARD" && "bg-[#1E40AF]/10 dark:bg-blue-900/30",
                                            t.tier === "PREMIUM" && "bg-amber-100 dark:bg-amber-900/30"
                                          )}
                                        >
                                          <Check
                                            className={cn(
                                              "h-2.5 w-2.5",
                                              tierIconColors[t.tier]
                                            )}
                                          />
                                        </div>
                                        <span className="leading-relaxed">{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-card p-5">
                      <p className="text-sm text-muted-foreground">
                        <span className="text-2xl font-bold text-foreground font-sans">
                          ₹{(expert.monthlyPrice ?? 0).toFixed(2)}
                        </span>
                        /month
                      </p>
                    </div>
                  )}
                </div>
              </StaggerItem>
            </StaggerContainer>
          </TabsContent>
        </Tabs>
      </FadeIn>
    </PageTransition>
  );
}
