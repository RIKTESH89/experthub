"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Archive,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { formatDate, truncate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from "@/components/ui/motion";

interface ContentPost {
  id: string;
  title?: string | null;
  content: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED" | "REMOVED";
  author: {
    id: string;
    name: string;
    image?: string | null;
  };
  createdAt: string;
  _count: {
    likes: number;
    comments: number;
    reports: number;
  };
}

const statusConfig = {
  PUBLISHED: {
    icon: CheckCircle,
    label: "Published",
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  DRAFT: {
    icon: FileText,
    label: "Draft",
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  ARCHIVED: {
    icon: Archive,
    label: "Archived",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  },
  REMOVED: {
    icon: XCircle,
    label: "Removed",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

export default function AdminContentPage() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/admin/content");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setPosts(data.posts ?? data);
      } catch {
        toast.error("Failed to load content");
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
        (post.content || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.author?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || post.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [posts, searchQuery, statusFilter]);

  const handleAction = useCallback(
    async (postId: string, action: "archive" | "remove" | "restore") => {
      setActionLoading(postId);
      try {
        const res = await fetch(`/api/admin/content/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) throw new Error(`Failed to ${action} post`);

        const statusMap = {
          archive: "ARCHIVED" as const,
          remove: "REMOVED" as const,
          restore: "PUBLISHED" as const,
        };

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, status: statusMap[action] } : p
          )
        );
        toast.success(
          `Post ${action === "archive" ? "archived" : action === "remove" ? "removed" : "restored"} successfully`
        );
      } catch {
        toast.error(`Failed to ${action} post`);
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((p) => p.status === "PUBLISHED").length,
      archived: posts.filter((p) => p.status === "ARCHIVED").length,
      reported: posts.filter((p) => p._count.reports > 0).length,
    }),
    [posts]
  );

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <PageTransition className="space-y-6 font-sans">
      {/* Header */}
      <FadeIn>
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E40AF]/10">
              <FileText className="h-4 w-4 text-[#1E40AF]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight font-sans">
              Content Moderation
            </h2>
          </div>
          <p className="mt-1.5 text-sm text-slate-500 font-sans">
            Review and moderate all posts across the platform.
          </p>
        </div>
      </FadeIn>

      {/* Quick Stats */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-4">
        <StaggerItem>
          <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-[#1E40AF]" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1E40AF]/10 ring-1 ring-[#1E40AF]/10">
                <FileText className="h-5 w-5 text-[#1E40AF]" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{stats.total}</p>
                <p className="text-xs font-medium text-slate-500">Total Posts</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-green-500" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 ring-1 ring-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{stats.published}</p>
                <p className="text-xs font-medium text-slate-500">Published</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gray-400" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-500/10 ring-1 ring-gray-500/10">
                <Archive className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{stats.archived}</p>
                <p className="text-xs font-medium text-slate-500">Archived</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{stats.reported}</p>
                <p className="text-xs font-medium text-slate-500">Reported</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Filters */}
      <FadeIn delay={0.15}>
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search posts by title, content, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-muted/40 pl-9 shadow-none transition-colors duration-200 focus-visible:bg-muted/60 focus-visible:ring-1 focus-visible:ring-[#1E40AF]/20"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full cursor-pointer border-0 bg-muted/40 shadow-none transition-colors duration-200 hover:bg-muted/60 sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">All Status</SelectItem>
              <SelectItem value="PUBLISHED" className="cursor-pointer">Published</SelectItem>
              <SelectItem value="DRAFT" className="cursor-pointer">Draft</SelectItem>
              <SelectItem value="ARCHIVED" className="cursor-pointer">Archived</SelectItem>
              <SelectItem value="REMOVED" className="cursor-pointer">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      {/* Table */}
      <FadeIn delay={0.2}>
        <Card className="overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-muted/60 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold text-slate-600 font-sans">Post</TableHead>
                  <TableHead className="font-semibold text-slate-600 font-sans">Author</TableHead>
                  <TableHead className="font-semibold text-slate-600 font-sans">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600 font-sans">Engagement</TableHead>
                  <TableHead className="font-semibold text-slate-600 font-sans">Date</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600 font-sans">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                          <Inbox className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-500 font-sans">
                          No posts found
                        </p>
                        <p className="mt-1 text-xs text-slate-400 font-sans">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => {
                    const status = statusConfig[post.status];
                    const StatusIcon = status.icon;

                    return (
                      <TableRow
                        key={post.id}
                        className="group border-b border-muted/40 transition-colors duration-200 hover:bg-muted/20"
                      >
                        <TableCell className="max-w-[300px]">
                          <p className="truncate text-sm font-medium transition-colors duration-200 group-hover:text-foreground font-sans">
                            {post.title || truncate(post.content, 50)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                              <AvatarImage
                                src={post.author.image ?? undefined}
                              />
                              <AvatarFallback className="bg-[#1E40AF]/10 text-[10px] font-semibold">
                                {getInitials(post.author.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium font-sans">{post.author.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-sm ${status.className}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-sans">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5">{post._count.likes} likes</span>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5">{post._count.comments} comments</span>
                            {post._count.reports > 0 && (
                              <Badge variant="destructive" className="rounded-full text-[10px] shadow-sm">
                                {post._count.reports} reports
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 font-sans">
                          {formatDate(post.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer rounded-lg opacity-60 transition-all duration-200 hover:bg-muted/60 hover:opacity-100 group-hover:opacity-100"
                                disabled={actionLoading === post.id}
                              >
                                {actionLoading === post.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl border-muted/60 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                              <DropdownMenuItem className="cursor-pointer rounded-lg">
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                View Post
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-muted/60" />
                              {post.status !== "ARCHIVED" && (
                                <DropdownMenuItem
                                  className="cursor-pointer rounded-lg"
                                  onClick={() =>
                                    handleAction(post.id, "archive")
                                  }
                                >
                                  <Archive className="mr-2 h-3.5 w-3.5" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              {(post.status === "ARCHIVED" ||
                                post.status === "REMOVED") && (
                                <DropdownMenuItem
                                  className="cursor-pointer rounded-lg"
                                  onClick={() =>
                                    handleAction(post.id, "restore")
                                  }
                                >
                                  <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                  Restore
                                </DropdownMenuItem>
                              )}
                              {post.status !== "REMOVED" && (
                                <DropdownMenuItem
                                  className="cursor-pointer rounded-lg text-destructive focus:text-destructive"
                                  onClick={() =>
                                    handleAction(post.id, "remove")
                                  }
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Remove
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.25}>
        <p className="text-xs text-slate-500 font-sans">
          Showing {filteredPosts.length} of {posts.length} posts
        </p>
      </FadeIn>
    </PageTransition>
  );
}
