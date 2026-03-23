"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  topConcepts: { concept: string; edgeCount: number }[];
}

export default function GraphStats() {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/expert/graph");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Silently fail on fetch
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const res = await fetch("/api/expert/graph", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Knowledge graph built: ${data.nodesCreated} nodes, ${data.edgesCreated} edges`
        );
        await fetchStats();
      } else {
        toast.error("Failed to build knowledge graph");
      }
    } catch {
      toast.error("Failed to build knowledge graph");
    } finally {
      setBuilding(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Knowledge Graph
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Knowledge Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && stats.nodeCount > 0 ? (
          <>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-semibold">{stats.nodeCount}</span> nodes
              </div>
              <div>
                <span className="font-semibold">{stats.edgeCount}</span> edges
              </div>
            </div>
            {stats.topConcepts.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Top Concepts
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.topConcepts.map((concept) => (
                    <Badge key={concept.concept} variant="secondary">
                      {concept.concept} ({concept.edgeCount})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No graph built yet. Build your knowledge graph to enhance AI
            responses with concept relationships.
          </p>
        )}
        <Button onClick={handleBuild} disabled={building} className="w-full">
          {building ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Building...
            </>
          ) : (
            <>
              <GitBranch className="mr-2 h-4 w-4" />
              Build Knowledge Graph
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
