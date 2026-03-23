"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TopicGap {
  topic: string;
  questionCount: number;
  avgQuality: number;
  sampleQuestions: string[];
}

interface TopicGapsCardProps {
  gaps: TopicGap[];
}

function QualityBar({ quality }: { quality: number }) {
  const percentage = Math.round(quality * 100);
  const color =
    quality > 0.4
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{percentage}%</span>
    </div>
  );
}

function TopicGapItem({ gap }: { gap: TopicGap }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-left text-sm font-medium hover:underline"
          >
            <span
              className="text-xs transition-transform"
              style={{ transform: expanded ? "rotate(90deg)" : "none" }}
            >
              &#9654;
            </span>
            {gap.topic}
          </button>
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{gap.questionCount} question{gap.questionCount !== 1 ? "s" : ""}</span>
            <QualityBar quality={gap.avgQuality} />
          </div>
        </div>
        <Link
          href="/expert/knowledge"
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add Knowledge
        </Link>
      </div>
      {expanded && gap.sampleQuestions.length > 0 && (
        <div className="mt-2 space-y-1 border-t pt-2">
          {gap.sampleQuestions.map((q, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              &ldquo;{q}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopicGapsCard({ gaps }: TopicGapsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Gaps</CardTitle>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <p className="text-sm font-medium">Your Digital Twin is performing well!</p>
            <p className="text-xs">No knowledge gaps detected in this period.</p>
          </div>
        ) : (
          <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2">
            {gaps.map((gap) => (
              <TopicGapItem key={gap.topic} gap={gap} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
