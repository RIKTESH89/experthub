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
  Inbox,
  ShieldAlert,
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
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from "@/components/ui/motion";

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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight font-sans">
              Reports Management
            </h2>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground font-sans">
            Review and handle user reports across the platform.
          </p>
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-4">
        <StaggerItem>
          <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-[#1E40AF] pointer-events-none" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1E40AF]/10 ring-1 ring-[#1E40AF]/10">
                <Flag className="h-5 w-5 text-[#1E40AF]" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{stats.total}</p>
                <p className="text-xs font-medium text-muted-foreground">Total Reports</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-yellow-500 pointer-events-none" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10 ring-1 ring-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{stats.pending}</p>
                <p className="text-xs font-medium text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-green-500 pointer-events-none" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 ring-1 ring-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{stats.resolved}</p>
                <p className="text-xs font-medium text-muted-foreground">Resolved</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gray-400 pointer-events-none" />
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-500/10 ring-1 ring-gray-500/10">
                <XCircle className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{stats.dismissed}</p>
                <p className="text-xs font-medium text-muted-foreground">Dismissed</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Filters */}
      <FadeIn delay={0.15}>
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-muted/40 pl-9 shadow-none transition-colors duration-200 focus-visible:bg-muted/60 focus-visible:ring-1 focus-visible:ring-[#1E40AF]/20"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full cursor-pointer border-0 bg-muted/40 shadow-none transition-colors duration-200 hover:bg-muted/60 sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">All Status</SelectItem>
              <SelectItem value="PENDING" className="cursor-pointer">Pending</SelectItem>
              <SelectItem value="RESOLVED" className="cursor-pointer">Resolved</SelectItem>
              <SelectItem value="DISMISSED" className="cursor-pointer">Dismissed</SelectItem>
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
                  <TableHead className="font-semibold text-muted-foreground font-sans">Reporter</TableHead>
                  <TableHead className="font-semibold text-muted-foreground font-sans">Reason</TableHead>
                  <TableHead className="font-semibold text-muted-foreground font-sans">Reported Post</TableHead>
                  <TableHead className="font-semibold text-muted-foreground font-sans">Status</TableHead>
                  <TableHead className="font-semibold text-muted-foreground font-sans">Date</TableHead>
                  <TableHead className="text-right font-semibold text-muted-foreground font-sans">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="py-16">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                          <Inbox className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-muted-foreground font-sans">
                          No reports found
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground font-sans">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => {
                    const status = statusConfig[report.status];
                    const StatusIcon = status.icon;

                    return (
                      <TableRow
                        key={report.id}
                        className="group border-b border-muted/40 transition-colors duration-200 hover:bg-muted/20"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                              <AvatarImage
                                src={report.reporter.image ?? undefined}
                              />
                              <AvatarFallback className="bg-[#1E40AF]/10 text-[10px] font-semibold">
                                {getInitials(report.reporter.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium font-sans">
                              {report.reporter.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full border-muted-foreground/20 px-2.5 font-medium shadow-sm">
                            {reasonLabels[report.reason] ?? report.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate text-sm font-medium transition-colors duration-200 group-hover:text-foreground font-sans">
                            {report.post?.title ||
                              (report.post?.content || "").slice(0, 40) + "..."}
                          </p>
                          <p className="text-xs text-muted-foreground font-sans">
                            by {report.post?.author?.name || "Unknown"}
                          </p>
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
                        <TableCell className="text-sm text-muted-foreground font-sans">
                          {formatDate(report.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 cursor-pointer rounded-lg opacity-60 transition-all duration-200 hover:bg-muted/60 hover:opacity-100 group-hover:opacity-100"
                                disabled={actionLoading === report.id}
                              >
                                {actionLoading === report.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl border-muted/60 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                              <DropdownMenuItem
                                className="cursor-pointer rounded-lg"
                                onClick={() => window.open(`/posts/${report.post.id}`, "_blank")}
                              >
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                View Post
                              </DropdownMenuItem>
                              {report.status === "PENDING" && (
                                <>
                                  <DropdownMenuSeparator className="bg-muted/60" />
                                  <DropdownMenuItem
                                    className="cursor-pointer rounded-lg"
                                    onClick={() =>
                                      handleAction(report.id, "resolve")
                                    }
                                  >
                                    <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                    Resolve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer rounded-lg"
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
      </FadeIn>

      <FadeIn delay={0.25}>
        <p className="text-xs text-muted-foreground font-sans">
          Showing {filteredReports.length} of {reports.length} reports
        </p>
      </FadeIn>
    </PageTransition>
  );
}
