"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Flag,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
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

interface Report {
  id: string;
  reason: string;
  description?: string | null;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    image?: string | null;
  };
  post: {
    id: string;
    title?: string | null;
    content: string;
    author: {
      name: string;
    };
  };
}

const statusConfig = {
  PENDING: {
    icon: Clock,
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  RESOLVED: {
    icon: CheckCircle,
    label: "Resolved",
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  DISMISSED: {
    icon: XCircle,
    label: "Dismissed",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  },
};

const reasonLabels: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  misinformation: "Misinformation",
  inappropriate: "Inappropriate Content",
  copyright: "Copyright Violation",
  other: "Other",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/admin/reports");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setReports(data.reports ?? data);
      } catch {
        toast.error("Failed to load reports");
      } finally {
        setIsLoading(false);
      }
    }
    fetchReports();
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        !searchQuery ||
        report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.reporter?.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (report.post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false);
      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, searchQuery, statusFilter]);

  const handleAction = useCallback(
    async (reportId: string, action: "resolve" | "dismiss") => {
      setActionLoading(reportId);
      try {
        const statusMap = {
          resolve: "RESOLVED" as const,
          dismiss: "DISMISSED" as const,
        };
        const res = await fetch(`/api/admin/reports`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, status: statusMap[action] }),
        });
        if (!res.ok) throw new Error(`Failed to ${action} report`);

        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status:
                    action === "resolve"
                      ? ("RESOLVED" as const)
                      : ("DISMISSED" as const),
                }
              : r
          )
        );
        toast.success(
          `Report ${action === "resolve" ? "resolved" : "dismissed"}`
        );
      } catch {
        toast.error(`Failed to ${action} report`);
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === "PENDING").length,
      resolved: reports.filter((r) => r.status === "RESOLVED").length,
      dismissed: reports.filter((r) => r.status === "DISMISSED").length,
    }),
    [reports]
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
          Reports Management
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and handle user reports across the platform.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Flag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/10">
              <XCircle className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.dismissed}</p>
              <p className="text-xs text-muted-foreground">Dismissed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
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
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reporter</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reported Post</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No reports found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => {
                  const status = statusConfig[report.status];
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage
                              src={report.reporter.image ?? undefined}
                            />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(report.reporter.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {report.reporter.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {reasonLabels[report.reason] ?? report.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm">
                          {report.post?.title ||
                            (report.post?.content || "").slice(0, 40) + "..."}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {report.post?.author?.name || "Unknown"}
                        </p>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(report.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={actionLoading === report.id}
                            >
                              {actionLoading === report.id ? (
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
                            {report.status === "PENDING" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleAction(report.id, "resolve")
                                  }
                                >
                                  <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                  Resolve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleAction(report.id, "dismiss")
                                  }
                                >
                                  <XCircle className="mr-2 h-3.5 w-3.5" />
                                  Dismiss
                                </DropdownMenuItem>
                              </>
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
        Showing {filteredReports.length} of {reports.length} reports
      </p>
    </div>
  );
}
