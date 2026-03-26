"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Lock, Zap } from "lucide-react";
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
        if (expertRes.ok) {
          setExpert(await expertRes.json());
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
      <div className="flex h-[calc(100vh-12rem)] flex-col space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="flex-1 rounded-lg" />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold">Expert Not Found</h2>
        <Button className="mt-4" asChild>
          <Link href="/subscriber/hub">Browse Experts</Link>
        </Button>
      </div>
    );
  }

  // Paywall for non-subscribers with no trial access
  const hasAccess = expert.isSubscribed || trialStatus?.hasTrialAccess;
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Card className="mx-auto max-w-md text-center">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Subscribe to Chat</CardTitle>
            <CardDescription>
              Subscribe to {expert.displayName} to access their AI Digital Twin
              and ask unlimited questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={expert.image ?? undefined} />
                <AvatarFallback>
                  {expert.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-semibold">{expert.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  Plans from Free
                </p>
              </div>
            </div>
            <Button
              className="w-full"
              asChild
            >
              <Link href={`/subscriber/experts/${expertId}`}>
                <Zap className="mr-2 h-4 w-4" />
                View Plans & Subscribe
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/subscriber/experts/${expertId}`}>
                View Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Chat Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/subscriber/experts/${expertId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={expert.image ?? undefined} />
          <AvatarFallback>{expert.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-sm font-semibold">
            {expert.displayName}&apos;s Digital Twin
          </h2>
          <p className="text-xs text-muted-foreground">
            AI-powered assistant based on expert knowledge
          </p>
        </div>
      </div>

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
    </div>
  );
}
