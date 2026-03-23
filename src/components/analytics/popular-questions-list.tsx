"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Question {
  question: string;
  answerQuality: number | null;
  topicCategory: string | null;
  sourcesUsed: number;
  createdAt: string;
}

interface PopularQuestionsListProps {
  questions: Question[];
}

function QualityDot({ quality }: { quality: number | null }) {
  if (quality === null) {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" title="No quality data" />;
  }
  const color =
    quality > 0.7
      ? "bg-green-500"
      : quality > 0.4
        ? "bg-yellow-500"
        : "bg-red-500";
  const label =
    quality > 0.7 ? "Good" : quality > 0.4 ? "Fair" : "Poor";

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
      title={`${label} (${(quality * 100).toFixed(0)}%)`}
    />
  );
}

export function PopularQuestionsList({ questions }: PopularQuestionsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Twin Questions</CardTitle>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No questions asked yet
          </div>
        ) : (
          <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2">
            {questions.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="mt-1.5">
                  <QualityDot quality={q.answerQuality} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{q.question}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{q.sourcesUsed} sources</span>
                    {q.topicCategory && (
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        {q.topicCategory}
                      </span>
                    )}
                    <span>
                      {new Date(q.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
