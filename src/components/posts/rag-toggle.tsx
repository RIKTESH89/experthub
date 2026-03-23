"use client";

import { useState, useCallback } from "react";
import { Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface RagToggleProps {
  postId: string;
  initialEnabled: boolean;
  onToggle?: (enabled: boolean) => void;
}

export function RagToggle({ postId, initialEnabled, onToggle }: RagToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (isUpdating) return;
      setIsUpdating(true);

      const previous = isEnabled;
      setIsEnabled(checked);

      try {
        const res = await fetch(`/api/posts/${postId}/rag-toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRagEnabled: checked }),
        });

        if (!res.ok) throw new Error("Failed to update RAG status");

        toast.success(
          checked
            ? "Post added to knowledge base"
            : "Post removed from knowledge base"
        );
        onToggle?.(checked);
      } catch {
        setIsEnabled(previous);
        toast.error("Failed to update RAG status");
      } finally {
        setIsUpdating(false);
      }
    },
    [isEnabled, isUpdating, postId, onToggle]
  );

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Brain
            className={cn(
              "h-4 w-4 transition-colors",
              isEnabled ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
        <Label
          htmlFor={`rag-${postId}`}
          className="cursor-pointer text-sm font-medium"
        >
          Knowledge Base
        </Label>
      </div>
      <Switch
        id={`rag-${postId}`}
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={isUpdating}
      />
      <span
        className={cn(
          "text-xs font-medium",
          isEnabled ? "text-primary" : "text-muted-foreground"
        )}
      >
        {isEnabled ? "Indexed" : "Not indexed"}
      </span>
    </div>
  );
}
