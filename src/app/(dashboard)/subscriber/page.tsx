"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  CreditCard,
  Bookmark,
  MessageSquare,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { ExpertCard, type Expert } from "@/components/experts/expert-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/ui/motion";

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
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [expertsLoading, setExpertsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setLoadError(false);
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
          setStats(null);
          setLoadError(true);
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
        setStats(null);
          setLoadError(true);
      } finally {
        setIsLoading(false);
        setExpertsLoading(false);
      }
    }
    fetchData();
  }, [retryKey]);

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

  return (
    <PageTransition className="space-y-8 font-sans studio-overview">
      <WelcomeBanner userName={session?.user?.name ?? "there"} role="SUBSCRIBER" />
      {loadError && <div role="alert" className="rounded-xl border border-border bg-card p-6"><p>Your workspace information couldn’t be loaded. Try again when the connection returns.</p><button className="studio-text-link mt-3" onClick={() => setRetryKey(key => key + 1)}>Try again</button></div>}
      {stats && <div className="studio-overview-stats">
        {statCardConfig.map(card => { const Icon=card.icon; return <div key={card.key}><Icon size={20} aria-hidden="true"/><p>{card.title}</p><strong>{stats?.[card.key] ?? 0}</strong><p>{card.description}</p></div>; })}
      </div>}
      {!loadError && <section className="studio-overview-library">
        <div><p className="studio-eyebrow">Your learning, in one place</p><h2>Start with a perspective.<br/>Follow your curiosity.</h2><p>{subscribedExperts.length ? "Continue a conversation with an expert’s AI Digital Twin. Check available sources as you explore." : "You haven’t subscribed to an expert yet. Explore profiles and review their available plans."}</p><Link className="studio-button" href="/subscriber/hub">Explore experts <ArrowRight size={18} aria-hidden="true"/></Link></div>
        <div className="studio-overview-note"><BookOpen size={28} aria-hidden="true"/><h3>Your experts</h3>{subscribedExperts.length ? <ul className="mt-4 space-y-3">{subscribedExperts.slice(0,5).map(expert=><li key={expert.id}><Link className="studio-text-link" href={`/subscriber/experts/${expert.id}/chat`}>{expert.displayName}<MessageSquare size={16} aria-hidden="true"/></Link></li>)}</ul> : <p>Expert content, saved posts and conversations will appear here as you explore.</p>}</div>
      </section>}
      <section><div className="flex items-center justify-between gap-4 mb-6"><h2 className="text-2xl font-medium">Explore expert perspectives</h2><Link className="studio-text-link" href="/subscriber/hub">Browse all <ArrowRight size={16}/></Link></div>{expertsLoading ? <Skeleton className="h-64 w-full"/> : recommendedExperts.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{recommendedExperts.map(expert=><ExpertCard key={expert.id} expert={expert}/>)}</div> : <p className="rounded-xl border border-border p-8 text-muted-foreground">No expert recommendations are available right now. Explore the hub to browse available profiles.</p>}</section>
    </PageTransition>
  );
}
