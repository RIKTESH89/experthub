"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
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
   IMAGE LIGHTBOX
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
        onClick={onClose}
      >
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={onClose}
          className="absolute right-5 top-5 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/20 hover:text-white"
        >
          <X className="h-5 w-5" />
        </motion.button>

        <div className="absolute left-5 top-5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium font-sans text-white/90 ring-1 ring-white/10">
          {currentIndex + 1} / {images.length}
        </div>

        {images.length > 1 && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/20 hover:text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </motion.button>
        )}

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="relative max-h-[85vh] max-w-[90vw]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[currentIndex].url}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
          />
        </motion.div>

        {images.length > 1 && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/20 hover:text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ================================================================
   INLINE AUDIO PLAYER
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
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3.5 transition-colors duration-200 hover:border-border">
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

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={togglePlay}
        className={cn(
          "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200",
          isPlaying
            ? "bg-blue-700 text-white"
            : "bg-blue-700/10 text-blue-700 hover:bg-blue-700/20 dark:text-blue-400"
        )}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
      </motion.button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="relative h-8 w-full overflow-hidden rounded-lg">
          <svg viewBox="0 0 200 32" className="h-full w-full text-muted-foreground" preserveAspectRatio="none">
            {Array.from({ length: 40 }).map((_, i) => {
              const h = ((i * 7 + 3) % 12) + 4;
              return <rect key={i} x={i * 5} y={16 - h / 2} width="3" height={h} rx="1.5" fill="currentColor" />;
            })}
          </svg>
          <div className="absolute inset-0 overflow-hidden transition-all duration-75" style={{ width: `${progress}%` }}>
            <svg viewBox="0 0 200 32" className="h-full w-full text-blue-700/70" preserveAspectRatio="none">
              {Array.from({ length: 40 }).map((_, i) => {
                const h = ((i * 7 + 3) % 12) + 4;
                return <rect key={i} x={i * 5} y={16 - h / 2} width="3" height={h} rx="1.5" fill="currentColor" />;
              })}
            </svg>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] font-medium font-sans text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

/* ================================================================
   COMPACT IMAGE GRID
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
        className="relative h-48 cursor-pointer overflow-hidden rounded-xl bg-muted ring-1 ring-border/30"
        onClick={() => onImageClick(0)}
      >
        <Image src={images[0].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid h-40 grid-cols-2 gap-1.5 overflow-hidden rounded-xl">
        {images.map((img, i) => (
          <div key={i} className="relative cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border/20" onClick={() => onImageClick(i)}>
            <Image src={img.url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid h-48 grid-cols-3 gap-1.5 overflow-hidden rounded-xl">
        <div className="relative col-span-2 cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border/20" onClick={() => onImageClick(0)}>
          <Image src={images[0].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
        </div>
        <div className="grid grid-rows-2 gap-1.5">
          {images.slice(1, 3).map((img, i) => (
            <div key={i} className="relative cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border/20" onClick={() => onImageClick(i + 1)}>
              <Image src={img.url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="grid h-48 grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden rounded-xl">
        {images.map((img, i) => (
          <div key={i} className="relative cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border/20" onClick={() => onImageClick(i)}>
            <Image src={img.url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
          </div>
        ))}
      </div>
    );
  }

  // 5+ images
  const remaining = count - 4;
  return (
    <div className="grid h-52 grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-xl">
      <div className="relative col-span-2 cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border/20" onClick={() => onImageClick(0)}>
        <Image src={images[0].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
      <div className="relative cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border/20" onClick={() => onImageClick(1)}>
        <Image src={images[1].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
      <div className="relative cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border/20" onClick={() => onImageClick(2)}>
        <Image src={images[2].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
      <div className="relative col-span-2 cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border/20" onClick={() => onImageClick(3)}>
        <Image src={images[3].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
      </div>
      <div className="relative col-span-2 cursor-pointer overflow-hidden rounded-lg bg-muted ring-1 ring-border/20" onClick={() => onImageClick(4)}>
        <Image src={images[4 < count ? 4 : count - 1].url} alt="" fill className="object-cover transition-transform duration-300 hover:scale-105" />
        {remaining > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-2xl font-bold font-sans text-white">+{remaining}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   COMPACT VIDEO THUMBNAIL
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
      className="group relative h-36 cursor-pointer overflow-hidden rounded-xl bg-muted ring-1 ring-border/30"
      onClick={onClick}
    >
      {video.thumbnail ? (
        <Image src={video.thumbnail} alt="" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="flex h-full items-center justify-center bg-muted" />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors duration-200 group-hover:bg-black/20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white ring-2 ring-white/20 transition-colors duration-200 group-hover:bg-blue-700 group-hover:ring-blue-700/30">
          <Play className="h-6 w-6 fill-current ml-0.5" />
        </div>
      </div>
      {video.duration && (
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium font-sans text-white">
          {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

/* ================================================================
   VIDEO LIGHTBOX & MEDIA GRID
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onClick={onClose}
        className="absolute right-5 top-5 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/20 hover:text-white"
      >
        <X className="h-5 w-5" />
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative max-h-[85vh] max-w-[90vw] w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={video.url}
          poster={video.thumbnail ?? undefined}
          controls
          autoPlay
          playsInline
          className="max-h-[85vh] max-w-[90vw] rounded-xl"
        />
      </motion.div>
    </motion.div>
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
      <div className="space-y-2.5">
        {images.length > 0 && (
          <CompactImageGrid images={images} onImageClick={openLightbox} />
        )}

        {videos.map((video, i) => (
          <CompactVideoThumbnail key={i} video={video} onClick={() => setVideoLightbox(video)} />
        ))}

        {audioFiles.map((a, i) => (
          <InlineAudioPlayer key={i} audio={a} />
        ))}
      </div>

      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <VideoLightbox
        video={videoLightbox}
        isOpen={!!videoLightbox}
        onClose={() => setVideoLightbox(null)}
      />
    </>
  );
}

/* ================================================================
   POST CARD
   ================================================================ */

export function PostCard({ post, onLikeToggle, onBookmarkToggle }: PostCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isTruncated = (post.content || "").length > 300;
  const viewTracked = useRef(false);

  useEffect(() => {
    if (isOpen && !viewTracked.current) {
      viewTracked.current = true;
      fetch(`/api/posts/${post.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [isOpen, post.id]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <Card className="group relative overflow-hidden border-border/50 bg-card transition-all duration-200 hover:border-border hover:shadow-md">
          {post.isPremiumOnly && (
            <div className="absolute inset-x-0 top-0 h-px bg-amber-500/50 pointer-events-none" />
          )}

          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
            <Link href={`/subscriber/experts/${post.author.id}`} className="cursor-pointer">
              <Avatar className="h-10 w-10 ring-1 ring-border transition-all duration-200 hover:ring-blue-700/30">
                <AvatarImage src={post.author.image ?? undefined} alt={post.author.name} />
                <AvatarFallback className="bg-blue-50 text-sm font-semibold font-sans text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                  {getInitials(post.author.name)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/subscriber/experts/${post.author.id}`}
                  className="cursor-pointer text-sm font-semibold font-sans transition-colors duration-200 hover:text-blue-700"
                >
                  {post.author.name}
                </Link>
                {post.isPremiumOnly && (
                  <Badge
                    variant="secondary"
                    className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  >
                    <Crown className="h-3 w-3" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Premium</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs font-sans text-muted-foreground">
                {formatRelativeDate(post.createdAt)}
              </p>
            </div>
          </CardHeader>

          <CardContent
            className={cn("space-y-3 pb-3", isTruncated && "cursor-pointer")}
            onClick={isTruncated ? () => setIsOpen(true) : undefined}
          >
            {post.title && (
              <h3 className="text-lg font-semibold font-sans leading-tight tracking-tight">{post.title}</h3>
            )}

            <p className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">
              {truncate(post.content, 300)}
            </p>

            {isTruncated && (
              <button
                type="button"
                className="cursor-pointer text-sm font-medium font-sans text-blue-700 transition-colors duration-200 hover:underline dark:text-blue-400"
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
              <div className="flex flex-wrap gap-1.5 pt-1">
                {post.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="rounded-full border-transparent bg-blue-700/[0.06] px-2.5 py-0.5 text-xs font-normal font-sans text-blue-700/80 transition-colors duration-200 hover:bg-blue-700/10 hover:text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-border/40 px-4 py-2.5 sm:px-6 sm:py-2">
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
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col max-w-[95vw] sm:max-w-2xl p-0 overflow-hidden border-border/50">
          <DialogHeader className="shrink-0 border-b border-border/40 bg-card px-6 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-1 ring-border">
                <AvatarImage src={post.author.image ?? undefined} alt={post.author.name} />
                <AvatarFallback className="bg-blue-50 text-sm font-semibold font-sans text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                  {getInitials(post.author.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-sm font-semibold font-sans">
                    {post.author.name}
                  </DialogTitle>
                  {post.isPremiumOnly && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    >
                      <Crown className="h-3 w-3" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Premium</span>
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-sans text-muted-foreground">
                  {formatRelativeDate(post.createdAt)}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-6 py-5">
              {post.title && (
                <h2 className="text-xl font-bold font-sans leading-tight tracking-tight">{post.title}</h2>
              )}

              <p className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">
                {post.content}
              </p>

              {(post.media ?? []).length > 0 && <MediaGrid media={post.media} />}

              {(post.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="rounded-full border-transparent bg-blue-700/[0.06] px-2.5 py-0.5 text-xs font-normal font-sans text-blue-700/80 hover:bg-blue-700/10 dark:bg-blue-500/10 dark:text-blue-400"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border/40 bg-card px-4 py-2.5 sm:px-6 sm:py-2">
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
