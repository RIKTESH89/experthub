import { Sparkles, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrialCounterProps {
  questionsUsed: number;
  questionsAllowed: number;
  isSubscribed?: boolean;
}

export function TrialCounter({ questionsUsed, questionsAllowed, isSubscribed }: TrialCounterProps) {
  const remaining = Math.max(0, questionsAllowed - questionsUsed);

  if (isSubscribed) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-blue-500/30 bg-blue-500/5 text-xs font-normal text-blue-600 dark:text-blue-400"
      >
        <MessageCircle className="h-3 w-3" />
        {remaining}/{questionsAllowed} msgs left
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-primary/30 bg-primary/5 text-xs font-normal text-primary"
    >
      <Sparkles className="h-3 w-3" />
      {remaining} free {remaining === 1 ? "question" : "questions"} left
    </Badge>
  );
}
