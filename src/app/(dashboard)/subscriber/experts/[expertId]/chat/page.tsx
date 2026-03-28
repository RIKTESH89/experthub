"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Lock, Zap, Shield, MessageCircle } from "lucide-react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  PageTransition,
  FadeIn,
  motion,
} from "@/components/ui/motion";

interface ExpertInfo {
  id: string;
  displayName: string;
  image?: string | null;
  monthlyPrice: number;
  isSubscribed: boolean;
}

interface TrialStatus {
  questionsUsed: number;
  questionsAllowed: number;
  hasSubscription: boolean;
  hasTrialAccess: boolean;
}

export default function SubscriberChatPage() {
  const params = useParams();
  const { data: session } = useSession();
  const expertId = params.expertId as string;

  const [expert, setExpert] = useState<ExpertInfo | null>(null);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [expertRes, trialRes] = await Promise.all([
          fetch(`/api/experts/${expertId}`),
          fetch(`/api/experts/${expertId}/trial-status`),
        ]);

        let expertData = null;
        if (expertRes.ok) {
          expertData = await expertRes.json();

          // Auto-verify PENDING payment if exists
          if (!expertData.isSubscribed && expertData.subscription?.razorpaySubscriptionId && expertData.subscription?.status === "PENDING") {
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ razorpaySubscriptionId: expertData.subscription.razorpaySubscriptionId }),
              });
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                if (verifyData.verified) {
                  const refreshRes = await fetch(`/api/experts/${expertId}`);
                  if (refreshRes.ok) {
                    expertData = await refreshRes.json();
                  }
                }
              }
            } catch { /* use original data */ }
          }

          setExpert(expertData);
        }
        if (trialRes.ok) {
          setTrialStatus(await trialRes.json());
        }
      } catch {
        toast.error("Failed to load expert information");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [expertId]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] flex-col space-y-4 font-sans">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="flex-1 rounded-lg" />
      </div>
    );
  }

  if (!expert) {
    return (
      <FadeIn className="flex flex-col items-center justify-center py-16 font-sans">
        <h2 className="text-lg font-semibold">Expert Not Found</h2>
        <Button className="mt-4 cursor-pointer" asChild>
          <Link href="/subscriber/hub">Browse Experts</Link>
        </Button>
      </FadeIn>
    );
  }

  // Paywall for non-subscribers with no trial access
  const hasAccess = expert.isSubscribed || trialStatus?.hasTrialAccess;
  if (!hasAccess) {
    return (
      <PageTransition className="flex flex-col items-center justify-center py-12 px-4 font-sans">
        <div className="relative mx-auto max-w-md w-full">
          <Card className="relative overflow-hidden border-[#1E40AF]/10">
            {/* Top accent bar */}
            <div className="h-1 bg-[#1E40AF]" />

            <CardHeader className="text-center pb-2 pt-8">
              {/* Lock icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                className="mx-auto mb-4"
              >
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#1E40AF]/10 border border-[#1E40AF]/20">
                  <Lock className="h-9 w-9 text-[#1E40AF]" />
                </div>
              </motion.div>

              <FadeIn delay={0.3}>
                <CardTitle className="text-xl font-bold tracking-tight font-sans">
                  Subscribe to Chat
                </CardTitle>
              </FadeIn>
              <FadeIn delay={0.4}>
                <CardDescription className="text-sm leading-relaxed mt-2">
                  Subscribe to {expert.displayName} to access their AI Digital Twin
                  and ask unlimited questions.
                </CardDescription>
              </FadeIn>
            </CardHeader>

            <CardContent className="space-y-5 pb-8">
              {/* Expert info card */}
              <FadeIn delay={0.45}>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14 ring-2 ring-[#1E40AF]/20 ring-offset-2 ring-offset-background">
                      <AvatarImage src={expert.image ?? undefined} />
                      <AvatarFallback className="text-lg font-semibold bg-[#1E40AF]/10">
                        {expert.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1E40AF] shadow-sm">
                      <MessageCircle className="h-2.5 w-2.5 text-white" />
                    </div>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm">{expert.displayName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Plans from Free
                    </p>
                  </div>
                </div>
              </FadeIn>

              {/* Features list */}
              <FadeIn delay={0.5}>
                <div className="space-y-2.5 px-1">
                  {[
                    { icon: Zap, text: "AI-powered expert knowledge" },
                    { icon: MessageCircle, text: "Ask unlimited questions" },
                    { icon: Shield, text: "Priority response quality" },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1E40AF]/10">
                        <feature.icon className="h-3 w-3 text-[#1E40AF]" />
                      </div>
                      {feature.text}
                    </div>
                  ))}
                </div>
              </FadeIn>

              {/* CTA Buttons */}
              <FadeIn delay={0.55}>
                <div className="space-y-2.5 pt-1">
                  <Button
                    className="w-full h-11 bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white font-semibold text-sm cursor-pointer"
                    asChild
                  >
                    <Link href={`/subscriber/experts/${expertId}`}>
                      <Zap className="mr-2 h-4 w-4" />
                      View Plans & Subscribe
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm border-[#1E40AF]/20 hover:bg-[#1E40AF]/5 cursor-pointer"
                    asChild
                  >
                    <Link href={`/subscriber/experts/${expertId}`}>
                      View Profile
                    </Link>
                  </Button>
                </div>
              </FadeIn>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="flex h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] flex-col font-sans">
      {/* Chat Header */}
      <FadeIn>
        <div className="mb-2 flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 cursor-pointer" asChild>
            <Link href={`/subscriber/experts/${expertId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="relative">
            <Avatar className="h-9 w-9 ring-2 ring-[#1E40AF]/15 ring-offset-1 ring-offset-background">
              <AvatarImage src={expert.image ?? undefined} />
              <AvatarFallback className="text-xs font-semibold">
                {expert.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold truncate font-sans">
              {expert.displayName}&apos;s Digital Twin
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs text-muted-foreground">
                AI-powered assistant &middot; Online
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          expertId={expertId}
          expertName={expert.displayName}
          expertImage={expert.image}
          currentUserName={session?.user?.name ?? "You"}
          currentUserImage={session?.user?.image}
        />
      </div>
    </PageTransition>
  );
}
