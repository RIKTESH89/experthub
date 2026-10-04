"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, Loader2, UserPlus, FileText, ArrowRight } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  AnimatedCounter,
  motion,
  AnimatePresence,
} from "@/components/ui/motion";

interface Application {
  id: string;
  name: string;
  email: string;
  specialty: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const statusConfig = {
  PENDING: {
    label: "Pending Review",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Clock,
    glow: "shadow-amber-500/5",
  },
  APPROVED: {
    label: "Approved",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: Check,
    glow: "shadow-emerald-500/5",
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: X,
    glow: "shadow-red-500/5",
  },
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_apps() {
      try {
        const res = await fetch("/api/admin/expert-applications");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setApplications(data.applications ?? []);
      } catch {
        toast.error("Failed to load applications");
      } finally {
        setIsLoading(false);
      }
    }
    fetch_apps();
  }, []);

  const handleAction = useCallback(async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/expert-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id
            ? { ...app, status: action === "approve" ? "APPROVED" as const : "REJECTED" as const }
            : app
        )
      );
      toast.success(action === "approve" ? "Expert approved and notified!" : "Application rejected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process application");
    } finally {
      setProcessingId(null);
    }
  }, []);

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;

  if (isLoading) {
    return (
      <div className="space-y-6 font-sans">
        <div>
          <h1 className="text-2xl font-bold font-sans">Expert Applications</h1>
          <p className="text-sm text-muted-foreground font-sans">Review and approve expert requests</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <FileText className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-medium tracking-tight font-sans">Expert Applications</h1>
            <p className="text-sm text-muted-foreground font-sans">
              Review and approve expert requests
            </p>
          </div>
        </div>
        {pendingCount > 0 && (
          <Badge
            variant="outline"
            className="gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-600 px-3 py-1.5 font-semibold shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full  rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Summary Stats */}
      {applications.length > 0 && (
        <StaggerContainer className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total", value: applications.length, color: "blue" },
            { label: "Approved", value: approvedCount, color: "emerald" },
            { label: "Pending", value: pendingCount, color: "amber" },
          ].map((stat) => (
            <StaggerItem key={stat.label}>
              <div className={cn(
                "flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-all duration-200 hover:shadow-sm",
                stat.color === "blue" && "border-l-4 border-l-primary",
                stat.color === "emerald" && "border-l-4 border-l-emerald-500",
                stat.color === "amber" && "border-l-4 border-l-amber-500",
              )}>
                <AnimatedCounter
                  value={stat.value}
                  className="text-2xl font-bold tracking-tight"
                />
                <span className="text-xs font-medium text-muted-foreground font-sans">{stat.label}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* Applications List */}
      {applications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-dashed border-2 border-muted-foreground/15">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/80 shadow-inner">
                  <UserPlus className="h-7 w-7 text-muted-foreground" />
                </div>
              </div>
              <p className="text-base font-semibold text-muted-foreground font-sans">No applications yet</p>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground font-sans">
                Expert applications will appear here when submitted. Check back later.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <StaggerContainer className="space-y-4">
          <AnimatePresence>
            {applications.map((app) => {
              const status = statusConfig[app.status];
              const StatusIcon = status.icon;
              const isPending = app.status === "PENDING";
              const isProcessing = processingId === app.id;

              return (
                <StaggerItem key={app.id}>
                  <Card className={cn(
                    "relative overflow-hidden transition-all duration-200",
                    isPending
                      ? "hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]  ring-1 ring-transparent hover:ring-amber-500/10"
                      : "opacity-70 hover:opacity-90",
                  )}>
                    {/* Top accent bar */}
                    <div className={cn(
                      "absolute inset-x-0 top-0 h-0.5 pointer-events-none",
                      app.status === "PENDING" && "bg-amber-500/60",
                      app.status === "APPROVED" && "bg-emerald-500/60",
                      app.status === "REJECTED" && "bg-red-500/60",
                    )} />

                    <CardHeader className="relative pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm",
                            isPending
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : app.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-700 dark:text-red-400"
                          )}>
                            {app.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold font-sans">{app.name}</CardTitle>
                            <p className="mt-0.5 text-sm text-muted-foreground font-sans">{app.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("gap-1.5 font-medium shadow-sm", status.color, status.glow)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="relative space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg bg-muted/30 p-3 border border-muted-foreground/5">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 font-sans">
                            Expertise
                          </p>
                          <p className="text-sm font-medium font-sans">{app.specialty}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3 border border-muted-foreground/5">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 font-sans">
                            Why they want to join
                          </p>
                          <p className="text-sm text-foreground line-clamp-3 font-sans">{app.reason}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-muted-foreground/8">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-sans">
                          <Clock className="h-3 w-3" />
                          Applied {formatRelativeDate(app.createdAt)}
                        </div>
                        {isPending && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 cursor-pointer gap-1.5 text-xs font-medium text-red-600 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:text-red-700 hover:border-red-500/30 transition-all duration-200"
                              onClick={() => handleAction(app.id, "reject")}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 cursor-pointer gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all duration-200"
                              onClick={() => handleAction(app.id, "approve")}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Approve
                              <ArrowRight className="h-3 w-3 ml-0.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </AnimatePresence>
        </StaggerContainer>
      )}
    </PageTransition>
  );
}
