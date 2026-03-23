import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrialCounterProps {
  questionsUsed: number;
  questionsAllowed: number;
}

export function TrialCounter({ questionsUsed, questionsAllowed }: TrialCounterProps) {
  const remaining = questionsAllowed - questionsUsed;
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
