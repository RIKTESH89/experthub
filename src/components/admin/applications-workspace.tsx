"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export interface Application {
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

export function AdminApplicationsWorkspace({ transport = fetch }: { transport?: typeof fetch }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const actionPending = useRef(false);
  const uncertainApplications = useRef(new Map<string, string>());
  const activeLoad = useRef<AbortController | null>(null);
  const approvalTrigger = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);

  const readApplications = useCallback(async (signal?: AbortSignal) => {
    const res = await transport("/api/admin/expert-applications", { cache: "no-store", signal });
    if (!res.ok) throw new Error("Applications could not be loaded. Check your administrator access and try again.");
    const data = await res.json();
    if (!Array.isArray(data.applications) || data.applications.some((app: Application) =>
      !app || typeof app.id !== "string" || typeof app.name !== "string" || typeof app.email !== "string" ||
      typeof app.specialty !== "string" || typeof app.reason !== "string" || typeof app.createdAt !== "string" ||
      !["PENDING", "APPROVED", "REJECTED"].includes(app.status))) {
      throw new Error("The application list is unavailable or incomplete.");
    }
    return data.applications as Application[];
  }, [transport]);

  const load = useCallback(async () => {
    if (activeLoad.current && !activeLoad.current.signal.aborted) return;
    const controller = new AbortController();
    activeLoad.current = controller;
    setIsLoading(true);
    setLoadError(null);
    try {
      const latest = await readApplications(controller.signal);
      if (!controller.signal.aborted) setApplications(latest);
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Applications are unavailable.");
    } finally {
      if (activeLoad.current === controller) {
        activeLoad.current = null;
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
  }, [readApplications]);
  useEffect(() => { void load(); return () => activeLoad.current?.abort(); }, [load]);

  const refreshApproval = async () => {
    if (actionPending.current || !selected) return;
    actionPending.current = true;
    setProcessingId(selected.id);
    try {
      const latest = await readApplications();
      setApplications(latest);
      const application = latest.find(app => app.id === selected.id);
      if (!application) throw new Error("This application is no longer available. Approval remains disabled.");
      uncertainApplications.current.delete(application.id);
      if (application.status !== "PENDING") {
        setSelected(null);
        toast.success(`Application status: ${application.status.toLowerCase()}.`);
      } else {
        setSelected(application);
        setApprovalError(null);
        setNeedsRefresh(false);
      }
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : "Status could not be checked. Try refreshing again.");
    } finally { actionPending.current = false; setProcessingId(null); }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    if (actionPending.current || (action === "approve" && (!selected || selected.id !== id || needsRefresh || uncertainApplications.current.has(id)))) return;
    actionPending.current = true;
    setProcessingId(id);
    setApprovalError(null);
    try {
      const res = await transport(`/api/admin/expert-applications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(typeof result.error === "string" ? result.error : "The application could not be processed.");
      const status = action === "approve" ? "APPROVED" : "REJECTED";
      if (result.status !== status) throw new Error("The server did not confirm the application status.");
      setApplications(prev => prev.map(app => app.id === id ? { ...app, status } : app));
      if (action === "approve") setSelected(null);
      toast.success(action === "approve" ? "Application approved." : "Application rejected.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The application could not be processed.";
      if (action === "approve") {
        const explanation = `${message} Refresh the application status before trying again.`;
        uncertainApplications.current.set(id, explanation);
        setApprovalError(explanation);
        setNeedsRefresh(true);
      } else { toast.error(message); }
    } finally { actionPending.current = false; setProcessingId(null); }
  };

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

  if (loadError) return <section className="space-y-4"><h1 className="text-2xl font-bold">Expert Applications</h1><p role="alert">{loadError}</p><Button onClick={() => void load()}>Retry applications</Button></section>;

  return (
    <PageTransition className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <FileText className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 ref={heading} tabIndex={-1} className="text-3xl font-medium tracking-tight font-sans">Expert Applications</h1>
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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
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
                            <CardTitle className="break-words text-base font-semibold font-sans">{app.name}</CardTitle>
                            <p className="mt-0.5 break-all text-sm text-muted-foreground font-sans">{app.email}</p>
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

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-muted-foreground/8">
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
                              disabled={processingId !== null}
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
                              onClick={(event) => {
                                approvalTrigger.current = event.currentTarget;
                                setSelected(app);
                                setApprovalError(uncertainApplications.current.get(app.id) ?? null);
                                setNeedsRefresh(uncertainApplications.current.has(app.id));
                              }}
                              disabled={processingId !== null}
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
      <AlertDialog open={selected !== null} onOpenChange={(open) => { if (!open && !actionPending.current) setSelected(null); }}>
        <AlertDialogContent className="max-h-[calc(100svh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto"
          onEscapeKeyDown={(event) => { if (actionPending.current) event.preventDefault(); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); const target = approvalTrigger.current; (target?.isConnected ? target : heading.current)?.focus(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this expert application?</AlertDialogTitle>
            <AlertDialogDescription>
              Approval grants expert access to this applicant and attempts to send an approval email. Email delivery is not confirmed here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selected && <dl className="space-y-2 break-words text-sm">
            <div><dt className="text-muted-foreground">Applicant</dt><dd className="font-semibold">{selected.name}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd className="break-all">{selected.email}</dd></div>
            <div><dt className="text-muted-foreground">Expertise</dt><dd>{selected.specialty}</dd></div>
          </dl>}
          {approvalError && <p role="alert" className="text-sm text-destructive">{approvalError}</p>}
          {processingId && <p role="status" className="text-sm">Processing request. Please wait…</p>}
          {needsRefresh && <Button variant="outline" disabled={processingId !== null} onClick={() => void refreshApproval()}>Refresh application status</Button>}
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={processingId !== null}>Cancel</AlertDialogCancel>
            <Button disabled={processingId !== null || needsRefresh} onClick={() => selected && void handleAction(selected.id, "approve")}>
              {processingId ? "Please wait…" : "Confirm approval"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
