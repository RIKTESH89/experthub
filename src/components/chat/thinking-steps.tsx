"use client";

import { Brain, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingStepsProps {
  steps: string[];
  isComplete: boolean;
}

export function ThinkingSteps({ steps, isComplete }: ThinkingStepsProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 mb-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Brain className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {isComplete ? "Thought process" : "Thinking..."}
        </span>
      </div>
      <div className="space-y-1">
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              "flex items-start gap-1.5 animate-in fade-in duration-300"
            )}
          >
            {isComplete ? (
              <Check className="h-3 w-3 mt-0.5 shrink-0 text-green-500" />
            ) : (
              <Loader2 className="h-3 w-3 mt-0.5 shrink-0 animate-spin text-muted-foreground" />
            )}
            <span className="text-xs italic text-muted-foreground">
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
