"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause, Crown, ChevronLeft, ChevronRight, X, Volume2 } from "lucide-react";
import { cn, formatRelativeDate, truncate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/* ================================================================
   IMAGE LIGHTBOX — full-screen popup with arrow navigation
   ================================================================ */

function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
}: {
  images: PostMedia[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-h-[85vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentIndex].url}
          alt=""
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        />
      </div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

/* ================================================================
   INLINE AUDIO PLAYER — click to play with progress bar
   ================================================================ */

function InlineAudioPlayer({ audio }: { audio: PostMedia }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audio.duration || 0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
      <audio
        ref={audioRef}
        src={audio.url}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          const pct = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100;
          setProgress(pct);
          setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => { setIsPlaying(false); setProgress(0); setCurrentTime(0); }}
      />

      {/* Play button */}
      <button
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
      </button>

      {/* Progress bar + waveform */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="relative h-8 w-full overflow-hidden rounded">
          {/* Waveform visualization (decorative) */}
          <svg viewBox="0 0 200 32" className="h-full w-full text-muted-foreground/20" preserveAspectRatio="none">
            {Array.from({ length: 40 }).map((_, i) => {
              const h = ((i * 7 + 3) % 12) + 4;
              return <rect key={i} x={i * 5} y={16 - h / 2} width="3" height={h} rx="1" fill="currentColor" />;
            })}
          </svg>
          {/* Progress overlay */}
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${progress}%` }}>
            <svg viewBox="0 0 200 32" className="h-full w-full text-primary/60" preserveAspectRatio="none">
              {Array.from({ length: 40 }).map((_, i) => {
                const h = ((i * 7 + 3) % 12) + 4;
                return <rect key={i} x={i * 5} y={16 - h / 2} width="3" height={h} rx="1" fill="currentColor" />;
              })}
            </svg>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

/* ================================================================
   COMPACT IMAGE GRID — smaller thumbnails with click to open lightbox
   ================================================================ */

function CompactImageGrid({
  images,
  onImageClick,
}: {
  images: PostMedia[];
  onImageClick: (index: number) => void;
}) {
  const count = images.length;

  if (count === 1) {
    return (
      <div
        className="relative h-48 cursor-pointer overflow-hidden rounded-lg bg-muted"
        onClick={() => onImageClick(0)}
      >
        <Image src={images[0].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid h-40 grid-cols-2 gap-1 overflow-hidden rounded-lg">
        {images.map((img, i) => (
          <div key={i} className="relative cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(i)}>
            <Image src={img.url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid h-48 grid-cols-3 gap-1 overflow-hidden rounded-lg">
        <div className="relative col-span-2 cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(0)}>
          <Image src={images[0].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
        </div>
        <div className="grid grid-rows-2 gap-1">
          {images.slice(1, 3).map((img, i) => (
            <div key={i} className="relative cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(i + 1)}>
              <Image src={img.url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="grid h-48 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-lg">
        {images.map((img, i) => (
          <div key={i} className="relative cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(i)}>
            <Image src={img.url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
          </div>
        ))}
      </div>
    );
  }

  // 5+ images
  const remaining = count - 4;
  return (
    <div className="grid h-52 grid-cols-4 grid-rows-2 gap-1 overflow-hidden rounded-lg">
      {/* First image spans 2 cols on first row */}
      <div className="relative col-span-2 cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(0)}>
        <Image src={images[0].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
      {/* Second image */}
      <div className="relative cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(1)}>
        <Image src={images[1].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
      {/* Third image */}
      <div className="relative cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(2)}>
        <Image src={images[2].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
      {/* Fourth image spans 2 cols on second row */}
      <div className="relative col-span-2 cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(3)}>
        <Image src={images[3].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
      {/* Fifth image or +N overlay */}
      <div className="relative col-span-2 cursor-pointer overflow-hidden bg-muted" onClick={() => onImageClick(4)}>
        <Image src={images[4 < count ? 4 : count - 1].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
        {remaining > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-xl font-bold text-white">+{remaining}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   COMPACT VIDEO THUMBNAIL — shows thumbnail with play icon, click to expand
   ================================================================ */

function CompactVideoThumbnail({
  video,
  onClick,
}: {
  video: PostMedia;
  onClick: () => void;
}) {
  return (
    <div
      className="relative h-36 cursor-pointer overflow-hidden rounded-lg bg-muted"
      onClick={onClick}
    >
      {video.thumbnail ? (
        <Image src={video.thumbnail} alt="" fill className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10" />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:scale-110">
          <Play className="h-5 w-5 fill-current" />
        </div>
      </div>
      {video.duration && (
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
          {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

/* ================================================================
   MEDIA GRID — compact layout with click-to-expand behavior
   ================================================================ */

function VideoLightbox({
  video,
  isOpen,
  onClose,
}: {
  video: PostMedia | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !video) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative max-h-[85vh] max-w-[90vw] w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={video.url}
          poster={video.thumbnail ?? undefined}
          controls
          autoPlay
          playsInline
          className="max-h-[85vh] max-w-[90vw] rounded-lg"
        />
      </div>
    </div>
  );
}

function MediaGrid({ media }: { media: PostMedia[] }) {
  const sorted = [...media].sort((a, b) => a.order - b.order);
  const images = sorted.filter((m) => m.type === "IMAGE");
  const videos = sorted.filter((m) => m.type === "VIDEO");
  const audioFiles = sorted.filter((m) => m.type === "AUDIO");

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [videoLightbox, setVideoLightbox] = useState<PostMedia | null>(null);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        {/* Images — compact grid, click opens lightbox */}
        {images.length > 0 && (
          <CompactImageGrid images={images} onImageClick={openLightbox} />
        )}

        {/* Videos — compact thumbnail, click opens video popup */}
        {videos.map((video, i) => (
          <CompactVideoThumbnail key={i} video={video} onClick={() => setVideoLightbox(video)} />
        ))}

        {/* Audio — inline player (compact by nature) */}
        {audioFiles.map((a, i) => (
          <InlineAudioPlayer key={i} audio={a} />
        ))}
      </div>

      {/* Image lightbox */}
      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Video lightbox */}
      <VideoLightbox
        video={videoLightbox}
        isOpen={!!videoLightbox}
        onClose={() => setVideoLightbox(null)}
      />
    </>
  );
}

/* ================================================================
   POST CARD — main component (untouched logic)
   ================================================================ */

export function PostCard({ post, onLikeToggle, onBookmarkToggle }: PostCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isTruncated = (post.content || "").length > 300;
  const viewTracked = useRef(false);

  // Track view when modal opens
  useEffect(() => {
    if (isOpen && !viewTracked.current) {
      viewTracked.current = true;
      fetch(`/api/posts/${post.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [isOpen, post.id]);

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

          {(post.media ?? []).length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <MediaGrid media={post.media} />
            </div>
          )}

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

        <CardFooter className="border-t border-border/50 px-4 py-2.5 sm:px-6 sm:py-2">
          <PostActions
            postId={post.id}
            likes={post._count?.likes ?? 0}
            comments={post._count?.comments ?? 0}
            bookmarks={post._count?.bookmarks ?? 0}
            isLiked={post.isLiked ?? false}
            isBookmarked={post.isBookmarked ?? false}
            onLikeToggle={onLikeToggle}
            onBookmarkToggle={onBookmarkToggle}
            onCommentClick={() => setIsOpen(true)}
          />
        </CardFooter>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col max-w-[95vw] sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
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

          <div className="min-h-0 flex-1 overflow-y-auto">
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
          </div>

          <div className="shrink-0 border-t border-border/50 px-4 py-2.5 sm:px-6 sm:py-2">
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
