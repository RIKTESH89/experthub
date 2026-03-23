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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-16 w-auto shrink-0">
            {/* Stacked documents */}
            <rect x="30" y="30" width="50" height="60" rx="4" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2"/>
            <rect x="38" y="22" width="50" height="60" rx="4" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2"/>
            <rect x="46" y="14" width="50" height="60" rx="4" fill="#f5f3ff" stroke="#6366f1" strokeWidth="2"/>
            {/* Document lines */}
            <line x1="54" y1="30" x2="86" y2="30" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
            <line x1="54" y1="38" x2="80" y2="38" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            <line x1="54" y1="46" x2="84" y2="46" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            <line x1="54" y1="54" x2="76" y2="54" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            {/* Database icon */}
            <ellipse cx="120" cy="50" rx="22" ry="8" fill="#ede9fe" stroke="#6366f1" strokeWidth="2"/>
            <path d="M98 50v18c0 4.4 9.8 8 22 8s22-3.6 22-8V50" stroke="#6366f1" strokeWidth="2" fill="none"/>
            <path d="M98 60c0 4.4 9.8 8 22 8s22-3.6 22-8" stroke="#8b5cf6" strokeWidth="1.5" fill="none"/>
            {/* Sparkle */}
            <path d="M24 16l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#8b5cf6"/>
            <path d="M110 18l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#6366f1" opacity="0.6"/>
          </svg>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Knowledge Base</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Power your AI Twin with content
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/expert/knowledge/import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/expert/knowledge/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Knowledge
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">
                    Total Items
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.indexed}</p>
                  <p className="text-xs text-muted-foreground">Indexed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* Knowledge Table */}
      <KnowledgeTable
        onAdd={() => router.push("/expert/knowledge/new")}
      />
    </div>
  );
}
