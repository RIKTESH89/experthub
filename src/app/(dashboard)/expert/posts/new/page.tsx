"use client";

import { ExpertStudio } from "@/components/expert-studio/expert-studio";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PenLine } from "lucide-react";
import { PostComposer } from "@/components/posts/post-composer";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn } from "@/components/ui/motion";

function ExpertNewPostPageContent() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <PageTransition className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <FadeIn delay={0.05}>
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6">
          <div className="relative flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="cursor-pointer h-10 w-10 shrink-0 rounded-xl border border-border/60 bg-background transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
            >
              <Link href="/expert/posts" aria-label="Back to posts">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary ">
              <PenLine className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Create New Post
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Share your expertise with your subscribers
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Composer Card */}
      <FadeIn delay={0.15}>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
          <div className="p-1">
            <PostComposer
              authorName={session?.user?.name ?? "Expert"}
              authorImage={session?.user?.image}
              onPostCreated={() => router.push("/expert/posts")}
            />
          </div>
        </div>
      </FadeIn>
    </PageTransition>
  );
}

export default function ExpertNewPostPage() {
  return <ExpertStudio section="posts/new"><ExpertNewPostPageContent /></ExpertStudio>;
}
