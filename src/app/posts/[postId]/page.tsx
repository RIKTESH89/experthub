"use client";

import styles from "@/components/public-studio/reading.module.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import {
  Crown,
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ArrowLeft,
  Send,
  LogIn,
  Sparkles,
} from "lucide-react";
import {
  cn,
  formatRelativeDate,
  getInitials,
  formatNumber,
} from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/* ================================================================
   TYPES
   ================================================================ */

interface PostMedia {
  type: "TEXT" | "VIDEO" | "AUDIO" | "IMAGE";
  url: string;
  thumbnail?: string;
  duration?: number;
  order: number;
}

interface PostComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; image?: string | null };
  replies?: PostComment[];
}

interface PostData {
  id: string;
  title?: string | null;
  content: string;
  status: string;
  isPremiumOnly?: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image?: string | null;
    expertProfile?: {
      displayName?: string;
      isVerified?: boolean;
    } | null;
  };
  media: PostMedia[];
  tags: string[];
  comments?: PostComment[];
  _count: {
    likes: number;
    comments: number;
    bookmarks: number;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
}

/* ================================================================
   MEDIA COMPONENTS (lightweight versions for this page)
   ================================================================ */

function PostImage({ src, onClick }: { src: string; onClick: () => void }) {
  return (
    <div
      className="relative h-64 sm:h-80 cursor-pointer overflow-hidden rounded-lg bg-muted"
      onClick={onClick}
    >
      <Image src={src} alt="" fill className="object-cover" />
    </div>
  );
}

function ImageLightbox({
  images,
  index,
  isOpen,
  onClose,
}: {
  images: PostMedia[];
  index: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);

  if (!isOpen || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        aria-label="Close image"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
          {current + 1} / {images.length}
        </div>
      )}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrent((i) => (i - 1 + images.length) % images.length);
          }}
          aria-label="Previous image"
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <div
        className="relative max-h-[85vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[current].url}
          alt=""
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        />
      </div>
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrent((i) => (i + 1) % images.length);
          }}
          aria-label="Next image"
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

/* ================================================================
   COMMENT COMPONENT
   ================================================================ */

function CommentItem({ comment }: { comment: PostComment }) {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={comment.user.image ?? undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(comment.user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs font-semibold">{comment.user.name}</p>
          <p className="mt-0.5 text-sm text-foreground/90">{comment.content}</p>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {formatRelativeDate(comment.createdAt)}
        </p>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 border-l-2 border-border/50 pl-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function PublicPostPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const postId = params.postId as string;

  const [post, setPost] = useState<PostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Action states
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const commentsRef = useRef<HTMLDivElement>(null);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch post
  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data: PostData = await res.json();
        setPost(data);
        setIsLiked(data.isLiked ?? false);
        setIsBookmarked(data.isBookmarked ?? false);
        setLikeCount(data._count.likes);
        setBookmarkCount(data._count.bookmarks);
        setComments(data.comments ?? []);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    if (postId) fetchPost();
  }, [postId]);

  // Scroll to comments if hash is #comments
  useEffect(() => {
    if (!isLoading && window.location.hash === "#comments") {
      commentsRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLoading]);

  const handleLike = useCallback(async () => {
    if (!session?.user) {
      router.push(`/login`);
      return;
    }
    if (isLiking) return;
    setIsLiking(true);
    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!isLiked);
    setLikeCount((c) => (isLiked ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  }, [session, isLiked, isLiking, likeCount, postId, router]);

  const handleBookmark = useCallback(async () => {
    if (!session?.user) {
      router.push(`/login`);
      return;
    }
    if (isBookmarking) return;
    setIsBookmarking(true);
    const prevBookmarked = isBookmarked;
    const prevCount = bookmarkCount;
    setIsBookmarked(!isBookmarked);
    setBookmarkCount((c) => (isBookmarked ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
    } catch {
      setIsBookmarked(prevBookmarked);
      setBookmarkCount(prevCount);
      toast.error("Failed to update bookmark");
    } finally {
      setIsBookmarking(false);
    }
  }, [session, isBookmarked, isBookmarking, bookmarkCount, postId, router]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }, []);

  const handleComment = useCallback(async () => {
    if (!session?.user) {
      router.push(`/login`);
      return;
    }
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (!res.ok) throw new Error();
      const newComment: PostComment = await res.json();
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  }, [session, commentText, isSubmitting, postId, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`${styles.page} ${styles.article}`}>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (notFound || !post) {
    return (
      <div className={`${styles.page} ${styles.state}`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="mt-2 text-muted-foreground">Post not found</p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const authorName =
    post.author.expertProfile?.displayName || post.author.name;
  const isVerified = post.author.expertProfile?.isVerified ?? false;
  const images = [...(post.media ?? [])]
    .filter((m) => m.type === "IMAGE")
    .sort((a, b) => a.order - b.order);
  const videos = [...(post.media ?? [])]
    .filter((m) => m.type === "VIDEO")
    .sort((a, b) => a.order - b.order);
  const isLoggedIn = sessionStatus === "authenticated";

  return (
    <div className={`${styles.page} ${styles.article}`}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Back to previous page"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Post</p>
          </div>
          {!isLoggedIn && (
            <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link href="/login">
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Author */}
        <div className="flex items-center gap-3">
          <Link href={isLoggedIn ? `/subscriber/experts/${post.author.id}` : "/login"}>
            <Avatar className="h-12 w-12 ring-2 ring-transparent hover:ring-primary/20 transition-all">
              <AvatarImage
                src={post.author.image ?? undefined}
                alt={authorName}
              />
              <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <Link
                href={isLoggedIn ? `/subscriber/experts/${post.author.id}` : "/login"}
                className="text-sm font-semibold hover:underline"
              >
                {authorName}
              </Link>
              {isVerified && (
                <svg
                  className="h-4 w-4 fill-primary text-primary-foreground"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatRelativeDate(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {post.isPremiumOnly && (
            <Badge
              variant="secondary"
              className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          )}

          {post.title && (
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">
              {post.title}
            </h1>
          )}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
            {post.content}
          </p>

          {/* Images */}
          {images.length > 0 && (
            <div className="space-y-2">
              {images.length === 1 ? (
                <PostImage
                  src={images[0].url}
                  onClick={() => {
                    setLightboxIndex(0);
                    setLightboxOpen(true);
                  }}
                />
              ) : (
                <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
                  {images.slice(0, 4).map((img, i) => (
                    <div
                      key={i}
                      className="relative h-40 cursor-pointer overflow-hidden bg-muted"
                      onClick={() => {
                        setLightboxIndex(i);
                        setLightboxOpen(true);
                      }}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                      {i === 3 && images.length > 4 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-xl font-bold text-white">
                            +{images.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Videos */}
          {videos.map((video, i) => (
            <div key={i} className="overflow-hidden rounded-lg">
              <video
                src={video.url}
                poster={video.thumbnail ?? undefined}
                controls
                playsInline
                className="w-full rounded-lg"
              />
            </div>
          ))}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between border-y border-border/50 py-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 text-muted-foreground",
              isLiked && "text-red-500 hover:text-red-600"
            )}
            onClick={handleLike}
            disabled={isLiking}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            <span className="text-xs">{formatNumber(likeCount)}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() =>
              commentsRef.current?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">
              {formatNumber(post._count.comments)}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 text-muted-foreground",
              isBookmarked && "text-yellow-500 hover:text-yellow-600"
            )}
            onClick={handleBookmark}
            disabled={isBookmarking}
          >
            <Bookmark
              className={cn("h-4 w-4", isBookmarked && "fill-current")}
            />
            <span className="text-xs">{formatNumber(bookmarkCount)}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Comments Section */}
        <div ref={commentsRef} className="mt-6 scroll-mt-20">
          <h2 className="text-sm font-semibold">
            Comments ({post._count.comments})
          </h2>

          {/* Comment input */}
          {isLoggedIn ? (
            <div className="mt-3 flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(session?.user?.name ?? "")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Textarea
                  aria-label="Write a comment"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[40px] resize-none text-sm"
                  rows={2}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleComment}
                    disabled={!commentText.trim() || isSubmitting}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to join the conversation
              </p>
              <Button size="sm" className="mt-2 gap-1.5" asChild>
                <Link href="/login">
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
              </Button>
            </div>
          )}

          {/* Comments list */}
          <div className="mt-4 space-y-4">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No comments yet. Be the first to share your thoughts.
              </p>
            )}
          </div>
        </div>

        {/* Bottom CTA for non-logged-in users */}
        {!isLoggedIn && (
          <div className="mt-10 rounded-xl border border-border bg-card p-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
            <h3 className="mt-3 text-base font-semibold">
              Join ExpertHub
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Subscribe to experts, get personalized AI insights, and join the conversation.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button asChild>
                <Link href="/login">Get Started</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={images}
        index={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
