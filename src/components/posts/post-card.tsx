"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Music, Crown } from "lucide-react";
import { cn, formatRelativeDate, truncate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PostActions } from "./post-actions";

interface PostMedia {
  type: "TEXT" | "VIDEO" | "AUDIO" | "IMAGE";
  url: string;
  thumbnail?: string;
  duration?: number;
  order: number;
}

interface PostAuthor {
  id: string;
  name: string;
  image?: string | null;
}

export interface Post {
  id: string;
  title?: string | null;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  isRagEnabled: boolean;
  isHidden: boolean;
  isPremiumOnly?: boolean;
  createdAt: string;
  author: PostAuthor;
  media: PostMedia[];
  tags: string[];
  _count: {
    likes: number;
    comments: number;
    bookmarks: number;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
}

interface PostCardProps {
  post: Post;
  onLikeToggle?: (postId: string) => void;
  onBookmarkToggle?: (postId: string) => void;
}

function MediaGrid({ media }: { media: PostMedia[] }) {
  const images = media.filter((m) => m.type === "IMAGE");
  const videos = media.filter((m) => m.type === "VIDEO");
  const audio = media.filter((m) => m.type === "AUDIO");

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-1 overflow-hidden rounded-lg",
            images.length === 1 && "grid-cols-1",
            images.length === 2 && "grid-cols-2",
            images.length >= 3 && "grid-cols-2"
          )}
        >
          {images.slice(0, 4).map((img, i) => (
            <div
              key={i}
              className={cn(
                "relative aspect-video overflow-hidden bg-muted",
                images.length === 3 && i === 0 && "row-span-2 aspect-square",
                images.length >= 4 && i < 2 && "aspect-video"
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
              />
              {images.length > 4 && i === 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-lg font-semibold text-white">
                    +{images.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {videos.map((video, i) => (
        <div
          key={i}
          className="relative aspect-video overflow-hidden rounded-lg bg-muted"
        >
          {video.thumbnail ? (
            <Image src={video.thumbnail} alt="" fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:scale-110">
              <Play className="h-6 w-6 fill-current" />
            </div>
          </div>
          {video.duration && (
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
              {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      ))}

      {audio.map((a, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Music className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Audio</p>
            {a.duration && (
              <p className="text-xs text-muted-foreground">
                {Math.floor(a.duration / 60)}:{String(a.duration % 60).padStart(2, "0")}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Play className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function PostCard({ post, onLikeToggle, onBookmarkToggle }: PostCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isTruncated = (post.content || "").length > 300;

  return (
    <>
      <Card className="group transition-all duration-200 hover:shadow-md dark:hover:shadow-primary/5">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
          <Link href={`/subscriber/experts/${post.author.id}`}>
            <Avatar className="h-10 w-10 ring-2 ring-transparent transition-all hover:ring-primary/20">
              <AvatarImage src={post.author.image ?? undefined} alt={post.author.name} />
              <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/subscriber/experts/${post.author.id}`}
              className="text-sm font-semibold hover:underline"
            >
              {post.author.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatRelativeDate(post.createdAt)}
            </p>
          </div>
        </CardHeader>

        <CardContent
          className={cn("space-y-3 pb-3", isTruncated && "cursor-pointer")}
          onClick={isTruncated ? () => setIsOpen(true) : undefined}
        >
          {post.isPremiumOnly && (
            <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          )}

          {post.title && (
            <h3 className="text-lg font-semibold leading-tight">{post.title}</h3>
          )}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {truncate(post.content, 300)}
          </p>

          {isTruncated && (
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
            >
              Read more
            </button>
          )}

          {(post.media ?? []).length > 0 && <MediaGrid media={post.media} />}

          {(post.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-border/50 px-6 py-2">
          <PostActions
            postId={post.id}
            likes={post._count?.likes ?? 0}
            comments={post._count?.comments ?? 0}
            bookmarks={post._count?.bookmarks ?? 0}
            isLiked={post.isLiked ?? false}
            isBookmarked={post.isBookmarked ?? false}
            onLikeToggle={onLikeToggle}
            onBookmarkToggle={onBookmarkToggle}
          />
        </CardFooter>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[85vh] max-w-[95vw] sm:max-w-2xl p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.image ?? undefined} alt={post.author.name} />
                <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-sm font-semibold">
                  {post.author.name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeDate(post.createdAt)}
                </p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-140px)]">
            <div className="space-y-4 px-6 py-4">
              {post.title && (
                <h2 className="text-xl font-bold leading-tight">{post.title}</h2>
              )}

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {post.content}
              </p>

              {(post.media ?? []).length > 0 && <MediaGrid media={post.media} />}

              {(post.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs font-normal">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border/50 px-6 py-2">
            <PostActions
              postId={post.id}
              likes={post._count?.likes ?? 0}
              comments={post._count?.comments ?? 0}
              bookmarks={post._count?.bookmarks ?? 0}
              isLiked={post.isLiked ?? false}
              isBookmarked={post.isBookmarked ?? false}
              onLikeToggle={onLikeToggle}
              onBookmarkToggle={onBookmarkToggle}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
