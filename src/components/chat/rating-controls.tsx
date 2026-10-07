"use client";
import { useEffect, useRef, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Rating = 1 | -1;
export function RatingControls({ rating, onRate }: { rating?: number | null; onRate?: (rating: Rating) => void | Promise<void> }) {
  const [displayed, setDisplayed] = useState<number | null>(rating ?? null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [retryRating, setRetryRating] = useState<Rating | null>(null);
  const pending = useRef(false);
  useEffect(() => { if (!pending.current) setDisplayed(rating ?? null); }, [rating]);
  async function rate(next: Rating) {
    if (!onRate || pending.current) return;
    pending.current = true;
    const previous = displayed;
    setDisplayed(next); setStatus("saving"); setRetryRating(null);
    try { await onRate(next); setStatus("saved"); }
    catch { setDisplayed(previous); setRetryRating(next); setStatus("failed"); }
    finally { pending.current = false; }
  }
  return <div className="space-y-2" role="group" aria-label="Response rating">
    <div className="mt-0.5 flex items-center gap-0.5">
      <button type="button" onClick={() => void rate(1)} disabled={!onRate || status === "saving"} aria-label="Thumbs up" aria-pressed={displayed === 1}
        className={cn("inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors disabled:cursor-wait disabled:opacity-60", displayed === 1 ? "bg-emerald-500/10 text-emerald-500" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><ThumbsUp className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={() => void rate(-1)} disabled={!onRate || status === "saving"} aria-label="Thumbs down" aria-pressed={displayed === -1}
        className={cn("inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors disabled:cursor-wait disabled:opacity-60", displayed === -1 ? "bg-red-500/10 text-red-500" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><ThumbsDown className="h-3.5 w-3.5" /></button>
    </div>
    {status === "saving" || status === "saved" ? <p role="status" className="text-xs text-muted-foreground">{status === "saving" ? "Saving rating…" : "Rating saved."}</p> : null}
    {status === "failed" ? <div className="space-y-1"><p role="alert" className="text-sm text-destructive">We couldn’t confirm your rating was saved. Try again.</p><button type="button" disabled={!onRate} className="min-h-11 cursor-pointer rounded-md px-3 text-sm underline disabled:cursor-not-allowed disabled:opacity-60" onClick={() => { if (retryRating !== null) void rate(retryRating); }}>Retry rating</button></div> : null}
  </div>;
}
