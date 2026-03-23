"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  Eye,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Loader2,
  Trash2,
  Pencil,
  Archive,
} from "lucide-react";
import { formatRelativeDate, truncate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";

interface ExpertPost {
  id: string;
  title?: string | null;
  content: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  isRagEnabled: boolean;
  createdAt: string;
  tags: string[];
  _count: {
    likes: number;
    comments: number;
    views: number;
  };
}

export default function ExpertPostsPage() {
  const [posts, setPosts] = useState<ExpertPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/expert/posts");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setPosts(data.posts ?? data);
      } catch {
        toast.error("Failed to load posts");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        !searchQuery ||
        (post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab =
        activeTab === "all" || post.status === activeTab.toUpperCase();
      return matchesSearch && matchesTab;
    });
  }, [posts, searchQuery, activeTab]);

  const handleDelete = useCallback(async (postId: string) => {
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleArchive = useCallback(async (postId: string) => {
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      if (!res.ok) throw new Error("Failed to archive");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, status: "ARCHIVED" as const } : p
        )
      );
      toast.success("Post archived");
    } catch {
      toast.error("Failed to archive post");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((p) => p.status === "PUBLISHED").length,
      draft: posts.filter((p) => p.status === "DRAFT").length,
      archived: posts.filter((p) => p.status === "ARCHIVED").length,
    }),
    [posts]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-16 w-auto shrink-0">
            {/* Text card 1 (back) */}
            <rect x="20" y="20" width="55" height="70" rx="4" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5"/>
            <line x1="28" y1="34" x2="66" y2="34" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            <line x1="28" y1="42" x2="58" y2="42" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            <line x1="28" y1="50" x2="62" y2="50" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            {/* Text card 2 (front) */}
            <rect x="40" y="10" width="55" height="70" rx="4" fill="#f5f3ff" stroke="#6366f1" strokeWidth="2"/>
            <line x1="48" y1="24" x2="86" y2="24" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="32" x2="78" y2="32" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="40" x2="82" y2="40" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="48" x2="74" y2="48" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="56" x2="80" y2="56" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
            {/* Pen */}
            <rect x="108" y="18" width="8" height="50" rx="2" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" transform="rotate(15 112 43)"/>
            <path d="M104 72l4.5-12 7 3z" fill="#8b5cf6"/>
            <circle cx="112" cy="23" r="1" fill="#6366f1" transform="rotate(15 112 23)"/>
            {/* Publish / send icon */}
            <path d="M130 60l14-8-14-8v6h-10v4h10z" fill="#8b5cf6" opacity="0.7"/>
            {/* Sparkle */}
            <path d="M130 16l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#6366f1" opacity="0.5"/>
          </svg>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">My Posts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your content
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/expert/posts/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="published">
            Published ({counts.published})
          </TabsTrigger>
          <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({counts.archived})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredPosts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No posts found"
              description={
                activeTab === "all"
                  ? "Create your first post to share with subscribers."
                  : `No ${activeTab} posts found.`
              }
              action={{
                label: "Create Post",
                onClick: () => (window.location.href = "/expert/posts/new"),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="group transition-all duration-200 hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/expert/posts/${post.id}`}
                          className="text-base font-semibold leading-tight hover:underline"
                        >
                          {post.title || "Untitled Post"}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelativeDate(post.createdAt)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            disabled={actionLoading === post.id}
                          >
                            {actionLoading === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/expert/posts/${post.id}/edit`}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleArchive(post.id)}
                          >
                            <Archive className="mr-2 h-3.5 w-3.5" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground">
                      {truncate(post.content, 120)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <Badge
                        variant={
                          post.status === "PUBLISHED"
                            ? "default"
                            : post.status === "DRAFT"
                              ? "outline"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {post.status.toLowerCase()}
                      </Badge>
                      {post.isRagEnabled && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-blue-500/10 text-blue-600"
                        >
                          RAG
                        </Badge>
                      )}
                      {post.tags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {post._count.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        {post._count.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {post._count.comments}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
