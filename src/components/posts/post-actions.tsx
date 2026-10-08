"use client";

import { useState, useCallback } from "react";
import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface PostActionsProps {
  postId: string;
  likes: number;
  comments: number;
  bookmarks: number;
  isLiked: boolean;
  isBookmarked: boolean;
  onLikeToggle?: (postId: string) => void;
  onBookmarkToggle?: (postId: string) => void;
  onCommentClick?: () => void;
}

export function PostActions({
  postId,
  likes,
  comments,
  bookmarks,
  isLiked: initialLiked,
  isBookmarked: initialBookmarked,
  onLikeToggle,
  onBookmarkToggle,
  onCommentClick,
}: PostActionsProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [likeCount, setLikeCount] = useState(likes);
  const [bookmarkCount, setBookmarkCount] = useState(bookmarks);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const handleLike = useCallback(async () => {
    if (isLiking) return;
    setIsLiking(true);

    const previousLiked = isLiked;
    const previousCount = likeCount;

    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle like");
      onLikeToggle?.(postId);
    } catch {
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  }, [isLiked, isLiking, likeCount, postId, onLikeToggle]);

  const handleBookmark = useCallback(async () => {
    if (isBookmarking) return;
    setIsBookmarking(true);

    const previousBookmarked = isBookmarked;
    const previousCount = bookmarkCount;

    setIsBookmarked(!isBookmarked);
    setBookmarkCount((prev) => (isBookmarked ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle bookmark");
      onBookmarkToggle?.(postId);
    } catch {
      setIsBookmarked(previousBookmarked);
      setBookmarkCount(previousCount);
      toast.error("Failed to update bookmark");
    } finally {
      setIsBookmarking(false);
    }
  }, [isBookmarked, isBookmarking, bookmarkCount, postId, onBookmarkToggle]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/posts/${postId}`
      );
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [postId]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex w-full items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 text-muted-foreground transition-colors",
                isLiked && "text-red-500 hover:text-red-600"
              )}
              aria-label={`${isLiked ? "Unlike" : "Like"} post, ${likeCount} likes`}
              aria-pressed={isLiked}
              onClick={handleLike}
              disabled={isLiking}
            >
              <Heart
                className={cn("h-4 w-4", isLiked && "fill-current")}
              />
              <span className="text-xs">{formatNumber(likeCount)}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isLiked ? "Unlike" : "Like"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              aria-label={`View comments, ${comments} comments`}
              onClick={onCommentClick}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{formatNumber(comments)}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Comment</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 text-muted-foreground transition-colors",
                isBookmarked && "text-yellow-500 hover:text-yellow-600"
              )}
              aria-label={`${isBookmarked ? "Remove bookmark" : "Bookmark post"}, ${bookmarkCount} bookmarks`}
              aria-pressed={isBookmarked}
              onClick={handleBookmark}
              disabled={isBookmarking}
            >
              <Bookmark
                className={cn("h-4 w-4", isBookmarked && "fill-current")}
              />
              <span className="text-xs">{formatNumber(bookmarkCount)}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isBookmarked ? "Remove bookmark" : "Bookmark"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              aria-label="Copy post link"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
