"use client";

import { useState, useCallback } from "react";
import { Share2, Link2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ShareButtonProps {
  sessionId: string | null;
}

export function ShareButton({ sessionId }: ShareButtonProps) {
  const [isShared, setIsShared] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchShareStatus = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/share`);
      if (res.ok) {
        const data = await res.json();
        setIsShared(data.isShared);
        if (data.shareUrl) setShareUrl(window.location.origin + data.shareUrl);
      }
    } catch {
      // ignore fetch errors
    }
  }, [sessionId]);

  const handleToggle = useCallback(
    async (enable: boolean) => {
      if (!sessionId) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chat/sessions/${sessionId}/share`, {
          method: enable ? "POST" : "DELETE",
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setIsShared(data.isShared);
        if (data.shareUrl) setShareUrl(window.location.origin + data.shareUrl);
        else setShareUrl(null);
        toast.success(enable ? "Conversation shared!" : "Sharing disabled");
      } catch {
        toast.error("Failed to update sharing");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  if (!sessionId) return null;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) fetchShareStatus();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Share Conversation</h4>
            <p className="text-xs text-muted-foreground">
              Anyone with the link can view this conversation
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="share-toggle" className="text-sm">
              {isShared ? "Sharing enabled" : "Enable sharing"}
            </Label>
            <Switch
              id="share-toggle"
              checked={isShared}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>

          {isShared && shareUrl && (
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-xs">
                {shareUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
