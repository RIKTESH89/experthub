"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Loader2, RefreshCw } from "lucide-react";

interface ScoreComponents {
  knowledgeCoverage: number;
  personalityCompleteness: number;
  graphDensity: number;
  subscriberRatings: number;
  responseQuality: number;
}

interface AccuracyScoreData {
  overallScore: number;
  components: ScoreComponents;
  calculatedAt: string;
}

const COMPONENT_LABELS: { key: keyof ScoreComponents; label: string }[] = [
  { key: "knowledgeCoverage", label: "Knowledge Coverage" },
  { key: "personalityCompleteness", label: "Personality Match" },
  { key: "graphDensity", label: "Graph Density" },
  { key: "subscriberRatings", label: "Subscriber Ratings" },
  { key: "responseQuality", label: "Response Quality" },
];

function getScoreColor(score: number): string {
  if (score < 30) return "#ef4444";
  if (score <= 70) return "#f59e0b";
  return "#22c55e";
}

function getScoreColorClass(score: number): string {
  if (score < 30) return "bg-red-500";
  if (score <= 70) return "bg-amber-500";
  return "bg-green-500";
}

function CircularProgress({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted/20"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const colorClass = getScoreColorClass(score);

  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${colorClass}`}
          style={{ width: `${score}%`, transition: "width 0.5s ease" }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-medium">{score}</span>
    </div>
  );
}

export function AccuracyScore() {
  const [data, setData] = useState<AccuracyScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch("/api/expert/accuracy-score");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshScore = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/expert/accuracy-score", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Skeleton className="h-[140px] w-[140px] rounded-full" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Twin Accuracy Score</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshScore}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Refresh Score
          </Button>
        </div>
        <CardDescription>
          How accurately your digital twin represents your expertise
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data && (
          <>
            <div className="flex justify-center">
              <CircularProgress score={data.overallScore} />
            </div>
            <div className="space-y-3">
              {COMPONENT_LABELS.map(({ key, label }) => (
                <ScoreBar
                  key={key}
                  label={label}
                  score={data.components[key]}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Last calculated:{" "}
              {new Date(data.calculatedAt).toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
