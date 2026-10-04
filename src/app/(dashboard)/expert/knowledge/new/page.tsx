"use client";

import { ExpertStudio } from "@/components/expert-studio/expert-studio";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";
import {
  PageTransition,
  FadeIn,
} from "@/components/ui/motion";

function ExpertNewKnowledgePageContent() {
  const router = useRouter();

  return (
    <PageTransition className="mx-auto max-w-2xl space-y-8">
      {/* Page Header */}
      <FadeIn direction="up" duration={0.5}>
        <div className="flex items-center gap-5">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer h-10 w-10 shrink-0 rounded-xl border border-border/50 shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary/50  dark:hover:bg-primary/5"
            asChild
          >
            <Link href="/expert/knowledge" aria-label="Back to knowledge library">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary ">
              <PenSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Add Knowledge Item
              </h1>
              <p className="text-sm text-muted-foreground">
                Add content to your knowledge base to power your Digital Twin
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Decorative divider */}
      <FadeIn delay={0.15} direction="none">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/40" />
          </div>
          <div className="relative flex justify-center">
            <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-primary/40 via-primary/40 to-primary/40" />
          </div>
        </div>
      </FadeIn>

      {/* Form */}
      <FadeIn delay={0.25} direction="up">
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-200 hover:border-border/80  sm:p-8">
          <KnowledgeForm
            onSuccess={() => router.push("/expert/knowledge")}
            onCancel={() => router.push("/expert/knowledge")}
          />
        </div>
      </FadeIn>
    </PageTransition>
  );
}

export default function ExpertNewKnowledgePage() {
  return <ExpertStudio section="knowledge/new"><ExpertNewKnowledgePageContent /></ExpertStudio>;
}
