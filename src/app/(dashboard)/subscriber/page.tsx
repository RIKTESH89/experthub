"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  CreditCard,
  Bookmark,
  MessageSquare,
  ArrowRight,
  Crown,
  TrendingUp,
  Users,
} from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { ExpertCard, type Expert } from "@/components/experts/expert-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
  AnimatedCounter,
} from "@/components/ui/motion";

interface SubscriberStats {
  activeSubscriptions: number;
  bookmarkedPosts: number;
  twinChats: number;
}

interface SubscribedExpert {
  id: string;
  displayName: string;
  image?: string | null;
}

const statCardConfig = [
  {
    key: "activeSubscriptions" as const,
    title: "Subscriptions",
    description: "experts subscribed",
    icon: CreditCard,
    iconBg: "bg-[#1E40AF]/10 ring-[#1E40AF]/20 group-hover:bg-[#1E40AF]/15",
    iconColor: "text-[#1E40AF] dark:text-blue-400",
    borderHover: "hover:border-[#1E40AF]/30",
  },
  {
    key: "bookmarkedPosts" as const,
    title: "Bookmarks",
    description: "posts saved",
    icon: Bookmark,
    iconBg: "bg-amber-500/10 ring-amber-500/20 group-hover:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderHover: "hover:border-amber-500/30",
  },
  {
    key: "twinChats" as const,
    title: "Twin Chats",
    description: "conversations",
    icon: MessageSquare,
    iconBg: "bg-emerald-500/10 ring-emerald-500/20 group-hover:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderHover: "hover:border-emerald-500/30",
  },
];

export default function SubscriberDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [recommendedExperts, setRecommendedExperts] = useState<Expert[]>([]);
  const [subscribedExperts, setSubscribedExperts] = useState<SubscribedExpert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expertsLoading, setExpertsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, expertsRes, subscribedRes] = await Promise.all([
          fetch("/api/subscriber/stats"),
          fetch("/api/experts/featured?limit=4"),
          fetch("/api/subscriptions"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else {
          setStats({ activeSubscriptions: 0, bookmarkedPosts: 0, twinChats: 0 });
        }

        if (expertsRes.ok) {
          const expertsData = await expertsRes.json();
          const rawExperts = expertsData.experts ?? expertsData ?? [];
          setRecommendedExperts(
            rawExperts.map((e: Record<string, unknown>) => {
              const profile = e.expertProfile as Record<string, unknown> | undefined;
              if (profile) {
                return {
                  id: e.id,
                  displayName: profile.displayName ?? e.name ?? "",
                  headline: e.headline ?? null,
                  specialty: profile.specialty ?? [],
                  image: e.image ?? null,
                  isVerified: profile.isVerified ?? false,
                  _count: {
                    subscribers: (profile.totalSubscribers as number) ?? 0,
                  },
                };
              }
              return e;
            })
          );
        }

        if (subscribedRes.ok) {
          const subscribedData = await subscribedRes.json();
          const subs = Array.isArray(subscribedData) ? subscribedData : subscribedData.experts ?? [];
          setSubscribedExperts(
            subs.slice(0, 5).map((s: { expert?: { id: string; displayName: string; image?: string | null }; id?: string; displayName?: string; image?: string | null }) => ({
              id: s.expert?.id ?? s.id ?? "",
              displayName: s.expert?.displayName ?? s.displayName ?? "",
              image: s.expert?.image ?? s.image ?? null,
            }))
          );
        }
      } catch {
        setStats({ activeSubscriptions: 0, bookmarkedPosts: 0, twinChats: 0 });
      } finally {
        setIsLoading(false);
        setExpertsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-5 md:grid-cols-5">
          <div className="md:col-span-3 space-y-5">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[8.5rem] rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-[13rem] w-full rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const displayedExperts = subscribedExperts.slice(0, 5);

  return (
    <PageTransition className="space-y-8 font-sans">
      {/* ========== Row 1: Hero Layout ========== */}
      <div className="grid gap-5 md:grid-cols-5">
        {/* Left Column: Welcome + Stat Cards */}
        <div className="md:col-span-3 flex flex-col gap-5">
          <FadeIn delay={0} duration={0.5} direction="up">
            <WelcomeBanner
              userName={session?.user?.name ?? "there"}
              role="SUBSCRIBER"
            />
          </FadeIn>

          {stats && (
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {statCardConfig.map((card) => {
                const Icon = card.icon;
                const value = stats[card.key];

                return (
                  <StaggerItem key={card.key}>
                    <div
                      className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5 ${card.borderHover}`}
                    >
                      <div className="relative">
                        {/* Header */}
                        <div className="flex items-center gap-2.5 mb-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 transition-all duration-200 ${card.iconBg}`}
                          >
                            <Icon className={`h-4 w-4 ${card.iconColor} transition-colors duration-200`} />
                          </div>
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                            {card.title}
                          </span>
                        </div>

                        {/* Animated value */}
                        <div className="flex items-baseline gap-1.5">
                          <AnimatedCounter
                            value={value}
                            duration={1.4}
                            className="text-3xl font-bold tracking-tight text-foreground font-sans"
                          />
                        </div>

                        {/* Description */}
                        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>

        {/* Right Column: Your Experts Widget */}
        <FadeIn delay={0.15} duration={0.5} direction="right" className="md:col-span-2 flex flex-col">
          <div className="relative flex-1 rounded-2xl bg-card border border-border/40 p-6 flex flex-col justify-between overflow-hidden">
            {/* Subtle top edge highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1E40AF]/20 to-transparent" />

            <div className="relative">
              {/* Section header */}
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E40AF]/10 ring-1 ring-[#1E40AF]/15">
                  <Users className="h-4 w-4 text-[#1E40AF]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight font-sans">
                    Your Experts
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Quick access to your network
                  </p>
                </div>
              </div>

              {/* Avatar row */}
              <div className="flex items-center -space-x-2.5">
                {displayedExperts.length > 0 ? (
                  <>
                    {displayedExperts.map((expert, index) => (
                      <Link
                        key={expert.id}
                        href={`/subscriber/experts/${expert.id}/chat`}
                        className="group/avatar relative z-[1] hover:z-10 transition-all duration-200 cursor-pointer"
                        title={`Chat with ${expert.displayName}`}
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <div className="relative">
                          <Avatar className="h-13 w-13 ring-[3px] ring-background transition-all duration-200 group-hover/avatar:scale-110 group-hover/avatar:ring-[#1E40AF]/30 shadow-sm group-hover/avatar:shadow-md">
                            <AvatarImage
                              src={expert.image ?? undefined}
                              alt={expert.displayName}
                            />
                            <AvatarFallback className="text-xs font-semibold bg-[#1E40AF]/5">
                              {getInitials(expert.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Chat icon overlay */}
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1E40AF] text-white shadow-md transition-all duration-200 group-hover/avatar:scale-110">
                            <MessageSquare className="h-2.5 w-2.5" />
                          </span>
                        </div>
                        {/* Tooltip-like name on hover */}
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium text-muted-foreground opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 pointer-events-none">
                          {expert.displayName.split(" ")[0]}
                        </span>
                      </Link>
                    ))}
                    {subscribedExperts.length > 5 && (
                      <span className="z-[1] flex h-13 w-13 items-center justify-center rounded-full bg-muted ring-[3px] ring-background text-xs font-bold text-muted-foreground shadow-sm">
                        +{subscribedExperts.length - 5}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No subscriptions yet. Discover experts below.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with stats and CTA */}
            <div className="relative mt-5 flex items-center justify-between pt-4 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <Crown className="h-3 w-3 text-[#1E40AF]/60" />
                <span className="text-xs font-medium text-muted-foreground">
                  <AnimatedCounter value={stats?.activeSubscriptions ?? 0} duration={1} className="font-bold text-foreground" />
                  {" "}subscription{(stats?.activeSubscriptions ?? 0) !== 1 ? "s" : ""}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs font-semibold hover:text-[#1E40AF] transition-colors duration-200 group/btn cursor-pointer"
                asChild
              >
                <Link href="/subscriber/hub">
                  Browse more
                  <ArrowRight className="ml-1 h-3 w-3 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* ========== Row 2: Discover Experts ========== */}
      <FadeIn delay={0.3} duration={0.5} direction="up">
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E40AF]/10 ring-1 ring-[#1E40AF]/10">
                <TrendingUp className="h-4 w-4 text-[#1E40AF]" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight font-sans">Discover Experts</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Handpicked recommendations for you
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="group/see font-semibold cursor-pointer"
              asChild
            >
              <Link href="/subscriber/hub">
                See All
                <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform duration-200 group-hover/see:translate-x-0.5" />
              </Link>
            </Button>
          </div>

          {expertsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : recommendedExperts.length > 0 ? (
            <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recommendedExperts.map((expert) => (
                <StaggerItem key={expert.id}>
                  <ExpertCard expert={expert} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border bg-card">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1E40AF]/5 mb-4">
                <Users className="h-8 w-8 text-[#1E40AF]/40" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                No recommendations yet
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground max-w-[240px]">
                Check back soon for expert suggestions tailored to your interests.
              </p>
            </div>
          )}
        </div>
      </FadeIn>
    </PageTransition>
  );
}
