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
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Content Moderation
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and moderate all posts across the platform.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.published}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/10">
              <Archive className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.archived}</p>
              <p className="text-xs text-muted-foreground">Archived</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.reported}</p>
              <p className="text-xs text-muted-foreground">Reported</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search posts by title, content, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
            <SelectItem value="REMOVED">Removed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No posts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPosts.map((post) => {
                  const status = statusConfig[post.status];
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-[300px]">
                        <p className="truncate text-sm font-medium">
                          {post.title || truncate(post.content, 50)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage
                              src={post.author.image ?? undefined}
                            />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(post.author.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{post.author.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`gap-1 ${status.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{post._count.likes} likes</span>
                          <span>{post._count.comments} comments</span>
                          {post._count.reports > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {post._count.reports} reports
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(post.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
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
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              View Post
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {post.status !== "ARCHIVED" && (
                              <DropdownMenuItem
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
                                className="text-destructive focus:text-destructive"
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

      <p className="text-xs text-muted-foreground">
        Showing {filteredPosts.length} of {posts.length} posts
      </p>
    </div>
  );
}
