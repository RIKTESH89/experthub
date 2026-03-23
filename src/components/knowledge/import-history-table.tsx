"use client";

import { useState, useEffect } from "react";
import { Globe, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ImportJob {
  id: string;
  sourceType: "BLOG_URL" | "PDF";
  sourceUrl: string | null;
  fileName: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  itemsCreated: number;
  errorMessage: string | null;
  createdAt: string;
}

interface HistoryResponse {
  items: ImportJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function ImportHistoryTable() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/knowledge/import/history?page=${page}&limit=20`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch {
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, [page]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusBadge(status: ImportJob["status"]) {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
      case "PROCESSING":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Processing</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import History</CardTitle>
        <CardDescription>
          View the status and details of your past imports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No imports yet. Use the Blog Import or PDF Import tabs to get started.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      {job.sourceType === "BLOG_URL" ? (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate text-sm">
                        {job.sourceUrl || job.fileName || "—"}
                      </p>
                      {job.errorMessage && (
                        <p className="mt-0.5 truncate text-xs text-destructive">
                          {job.errorMessage}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="text-right">{job.itemsCreated}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {data.totalPages} ({data.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
