"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bot } from "lucide-react";
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

export default function SubscriberExpertProfilePage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchExpert() {
      try {
        const res = await fetch(`/api/experts/${expertId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setExpert(data);
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

            {/* Pricing */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Subscription</h3>
              <p className="text-sm text-muted-foreground">
                <span className="text-2xl font-bold text-foreground">
                  ${(expert.monthlyPrice ?? 0).toFixed(2)}
                </span>
                /month
              </p>
              <p className="text-xs text-muted-foreground">
                Includes access to all posts, Digital Twin chat, and exclusive
                content.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
