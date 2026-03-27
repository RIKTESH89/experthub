"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, Loader2, UserPlus } from "lucide-react";
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
  PENDING: { label: "Pending", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Check },
  REJECTED: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: X },
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Expert Applications</h1>
          <p className="text-sm text-muted-foreground">Review and approve expert requests</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expert Applications</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve expert requests
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-600">
            <Clock className="h-3 w-3" />
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserPlus className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No applications yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Expert applications will appear here when submitted.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const status = statusConfig[app.status];
            const StatusIcon = status.icon;
            const isPending = app.status === "PENDING";
            const isProcessing = processingId === app.id;

            return (
              <Card key={app.id} className={cn(!isPending && "opacity-75")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{app.name}</CardTitle>
                      <p className="mt-0.5 text-sm text-muted-foreground">{app.email}</p>
                    </div>
                    <Badge variant="outline" className={cn("gap-1", status.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expertise</p>
                    <p className="mt-0.5 text-sm">{app.specialty}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Why they want to join</p>
                    <p className="mt-0.5 text-sm text-foreground/90">{app.reason}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Applied {formatRelativeDate(app.createdAt)}
                    </p>
                    {isPending && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-700"
                          onClick={() => handleAction(app.id, "reject")}
                          disabled={isProcessing}
                        >
                          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => handleAction(app.id, "approve")}
                          disabled={isProcessing}
                        >
                          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
