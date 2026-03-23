"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Upload,
  MessageSquare,
  Check,
  Clock,
  Pencil,
  Trash2,
  Loader2,
  Globe,
  FileUp,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";

interface KnowledgeItem {
  id: string;
  title: string;
  sourceType: "manual" | "document" | "post";
  isIndexed: boolean;
  createdAt: string;
}

interface KnowledgeTableProps {
  onEdit?: (item: KnowledgeItem) => void;
  onAdd?: () => void;
}

const sourceTypeConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  manual: { icon: FileText, label: "Manual", color: "text-blue-500" },
  document: { icon: Upload, label: "Document", color: "text-purple-500" },
  post: { icon: MessageSquare, label: "Post", color: "text-green-500" },
  blog: { icon: Globe, label: "Blog", color: "text-orange-500" },
  pdf: { icon: FileUp, label: "PDF", color: "text-red-500" },
};

export function KnowledgeTable({ onEdit, onAdd }: KnowledgeTableProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch("/api/knowledge");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setItems(data.items ?? data);
      } catch {
        toast.error("Failed to load knowledge items");
      } finally {
        setIsLoading(false);
      }
    }
    fetchItems();
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Knowledge item deleted");
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No knowledge items yet"
        description="Add content to your knowledge base to power your AI twin."
        action={onAdd ? { label: "Add Knowledge", onClick: onAdd } : undefined}
      />
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const source = sourceTypeConfig[item.sourceType] || sourceTypeConfig.manual;
            const SourceIcon = source.icon;

            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <SourceIcon className={cn("h-3.5 w-3.5", source.color)} />
                    <span className="text-sm">{source.label}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {item.isIndexed ? (
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400"
                    >
                      <Check className="h-3 w-3" />
                      Indexed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(item.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit?.(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
