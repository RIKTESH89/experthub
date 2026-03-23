"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Calendar,
  Brain,
  Loader2,
} from "lucide-react";
import { formatDate, formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface PostDetail {
  id: string;
  title?: string | null;
  content: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  isRagEnabled: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  media: Array<{
    type: "TEXT" | "VIDEO" | "AUDIO" | "IMAGE";
    url: string;
    thumbnail?: string;
    order: number;
  }>;
  _count: {
    likes: number;
    comments: number;
    bookmarks: number;
    views: number;
  };
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      name: string;
      image?: string | null;
    };
  }>;
}

export default function ExpertPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) throw new Error("Failed to fetch post");
        const data = await res.json();
        setPost(data);
      } catch {
        toast.error("Failed to load post");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPost();
  }, [postId]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Post deleted");
      router.push("/expert/posts");
    } catch {
      toast.error("Failed to delete post");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold">Post Not Found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The post you are looking for does not exist.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/expert/posts">Back to Posts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/expert/posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {post.title || "Untitled Post"}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(post.createdAt)}
              <span className="text-xs">
                ({formatRelativeDate(post.createdAt)})
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/expert/posts/${post.id}/edit`}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Post</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this post? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status & Tags */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            post.status === "PUBLISHED"
              ? "default"
              : post.status === "DRAFT"
                ? "outline"
                : "secondary"
          }
        >
          {post.status.toLowerCase()}
        </Badge>
        {post.isRagEnabled && (
          <Badge
            variant="secondary"
            className="gap-1 bg-blue-500/10 text-blue-600"
          >
            <Brain className="h-3 w-3" />
            RAG Enabled
          </Badge>
        )}
        {post.isHidden && (
          <Badge variant="secondary" className="gap-1">
            Hidden
          </Badge>
        )}
        {(post.tags ?? []).map((tag) => (
          <Badge key={tag} variant="secondary" className="font-normal">
            #{tag}
          </Badge>
        ))}
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-2 p-3">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{post._count.views}</p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-3">
            <Heart className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-lg font-bold">{post._count.likes}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-3">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{post._count.comments}</p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-3">
            <Bookmark className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-lg font-bold">{post._count.bookmarks}</p>
              <p className="text-xs text-muted-foreground">Bookmarks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Post Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          </div>

          {/* Media */}
          {(post.media ?? []).length > 0 && (
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {post.media.map((m, i) => (
                <div
                  key={i}
                  className="relative aspect-video overflow-hidden rounded-lg bg-muted"
                >
                  {m.type === "IMAGE" && (
                    <Image
                      src={m.url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  )}
                  {m.type === "VIDEO" && (
                    <video
                      src={m.url}
                      controls
                      className="h-full w-full object-cover"
                    />
                  )}
                  {m.type === "AUDIO" && (
                    <div className="flex h-full items-center justify-center p-4">
                      <audio src={m.url} controls className="w-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Comments ({post._count.comments})</CardTitle>
        </CardHeader>
        <CardContent>
          {post.comments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No comments yet
            </p>
          ) : (
            <div className="space-y-4">
              {post.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {(comment.user?.name || "?").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {comment.user?.name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
