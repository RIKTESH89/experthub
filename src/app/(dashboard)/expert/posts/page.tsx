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
  Sparkles,
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
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from "@/components/ui/motion";

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

const statusConfig = {
  PUBLISHED: {
    label: "Published",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15",
    dot: "bg-emerald-500",
  },
  DRAFT: {
    label: "Draft",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15",
    dot: "bg-amber-500",
  },
  ARCHIVED: {
    label: "Archived",
    className:
      "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/15",
    dot: "bg-zinc-400",
  },
};

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
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <FadeIn delay={0.05}>
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-500/5 via-background to-blue-500/5 p-6">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1E40AF] shadow-lg shadow-blue-700/25">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">My Posts</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Manage and track your published content
                </p>
              </div>
            </div>
            <Button
              asChild
              className="cursor-pointer bg-[#1E40AF] text-white shadow-lg shadow-blue-700/25 hover:bg-[#1e3a8a] transition-all duration-200"
            >
              <Link href="/expert/posts/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Post
              </Link>
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Search */}
      <FadeIn delay={0.1}>
        <div className="relative group">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-blue-700" />
            <Input
              placeholder="Search your posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border-border/60 bg-background pl-11 transition-all duration-200 focus-visible:border-blue-600/50 focus-visible:ring-blue-600/20"
            />
          </div>
        </div>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={0.15}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-11 w-full justify-start gap-1 rounded-xl border bg-muted p-1  sm:w-auto">
            <TabsTrigger
              value="all"
              className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              All
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                {counts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="published"
              className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Published
              <span className="ml-1.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                {counts.published}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="draft"
              className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Draft
              <span className="ml-1.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-amber-600 dark:text-amber-400">
                {counts.draft}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Archived
              <span className="ml-1.5 rounded-full bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-500">
                {counts.archived}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-5">
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
                  onClick: () =>
                    (window.location.href = "/expert/posts/new"),
                }}
              />
            ) : (
              <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredPosts.map((post) => {
                  const status = statusConfig[post.status];
                  return (
                    <StaggerItem key={post.id}>
                      <Card className="group relative overflow-hidden rounded-xl border-border/60 bg-background transition-all duration-200 hover:border-blue-600/30 hover:shadow-lg hover:-translate-y-0.5">
                        {/* Subtle top accent line */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-600/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/expert/posts/${post.id}`}
                                className="cursor-pointer text-base font-semibold leading-tight transition-colors duration-200 hover:text-blue-700 dark:hover:text-blue-400"
                              >
                                {post.title || "Untitled Post"}
                              </Link>
                              <p className="mt-1.5 text-xs text-muted-foreground">
                                {formatRelativeDate(post.createdAt)}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 rounded-lg opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-muted"
                                  disabled={actionLoading === post.id}
                                >
                                  {actionLoading === post.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-xl"
                              >
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/expert/posts/${post.id}/edit`}
                                  >
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
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {truncate(post.content, 120)}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {/* Animated status badge */}
                            <Badge
                              variant="outline"
                              className={`gap-1.5 rounded-full border text-[10px] font-medium ${status.className}`}
                            >
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot} animate-pulse`}
                              />
                              {status.label}
                            </Badge>
                            {post.isRagEnabled && (
                              <Badge
                                variant="outline"
                                className="gap-1 rounded-full border-blue-500/20 bg-blue-500/10 text-[10px] font-medium text-blue-600 hover:bg-blue-500/15 dark:text-blue-400"
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                RAG
                              </Badge>
                            )}
                            {post.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="rounded-full text-[10px] font-normal"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>

                        <CardFooter className="border-t border-border/50 pt-3">
                          <div className="flex items-center gap-5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                              <Eye className="h-3.5 w-3.5" />
                              {post._count.views}
                            </span>
                            <span className="flex items-center gap-1.5 transition-colors hover:text-rose-500">
                              <Heart className="h-3.5 w-3.5" />
                              {post._count.likes}
                            </span>
                            <span className="flex items-center gap-1.5 transition-colors hover:text-blue-500">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {post._count.comments}
                            </span>
                          </div>
                        </CardFooter>
                      </Card>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}
          </TabsContent>
        </Tabs>
      </FadeIn>
    </PageTransition>
  );
}
