"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Database, Check, Clock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { KnowledgeTable } from "@/components/knowledge/knowledge-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
  AnimatedCounter,
} from "@/components/ui/motion";

interface KnowledgeStats {
  total: number;
  indexed: number;
  pending: number;
}

export default function ExpertKnowledgePage() {
  const router = useRouter();
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/knowledge/stats");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setStats(data);
      } catch {
        setStats({ total: 0, indexed: 0, pending: 0 });
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <PageTransition className="space-y-8">
      {/* Page Header */}
      <FadeIn direction="up" duration={0.5}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E40AF] shadow-lg shadow-blue-700/25">
              <Database className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Knowledge Base
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Power your AI Twin with expert content and insights
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="cursor-pointer border-border/60 shadow-sm transition-all duration-200 hover:border-blue-600/30 hover:bg-blue-50/50 hover:shadow-md dark:hover:bg-blue-500/5"
              asChild
            >
              <Link href="/expert/knowledge/import">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Link>
            </Button>
            <Button
              className="cursor-pointer bg-[#1E40AF] shadow-lg shadow-blue-700/25 transition-all duration-200 hover:bg-[#1e3a8a] hover:shadow-xl"
              asChild
            >
              <Link href="/expert/knowledge/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Knowledge
              </Link>
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        stats && (
          <StaggerContainer className="grid gap-4 sm:grid-cols-3">
            {/* Total Items */}
            <StaggerItem>
              <Card className="group relative overflow-hidden border-border/50 transition-all duration-200 hover:border-blue-600/30 hover:shadow-lg hover:-translate-y-0.5">
                <CardContent className="relative flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/10 transition-all duration-200 group-hover:ring-blue-500/20">
                    <Database className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold tracking-tight">
                      <AnimatedCounter value={stats.total} />
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Total Items
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Indexed */}
            <StaggerItem>
              <Card className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-green-500/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <CardContent className="relative flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 ring-1 ring-emerald-500/10 transition-all duration-300 group-hover:ring-emerald-500/20 group-hover:shadow-md group-hover:shadow-emerald-500/10">
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold tracking-tight">
                      <AnimatedCounter value={stats.indexed} />
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Indexed
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Pending */}
            <StaggerItem>
              <Card className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-yellow-500/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <CardContent className="relative flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 ring-1 ring-amber-500/10 transition-all duration-300 group-hover:ring-amber-500/20 group-hover:shadow-md group-hover:shadow-amber-500/10">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold tracking-tight">
                      <AnimatedCounter value={stats.pending} />
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Pending
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>
        )
      )}

      {/* Knowledge Table */}
      <FadeIn delay={0.3} direction="up">
        <KnowledgeTable
          onAdd={() => router.push("/expert/knowledge/new")}
        />
      </FadeIn>
    </PageTransition>
  );
}
