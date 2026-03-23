"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeForm } from "@/components/knowledge/knowledge-form";

export default function ExpertNewKnowledgePage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/expert/knowledge">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Add Knowledge Item
          </h2>
          <p className="text-sm text-muted-foreground">
            Add content to your knowledge base to power your Digital Twin
          </p>
        </div>
      </div>

      <KnowledgeForm
        onSuccess={() => router.push("/expert/knowledge")}
        onCancel={() => router.push("/expert/knowledge")}
      />
    </div>
  );
}
