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
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const sourceTypeConfig: Record<
  string,
  { icon: typeof FileText; label: string; color: string; bg: string }
> = {
  manual: {
    icon: FileText,
    label: "Manual",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-700/10",
  },
  document: {
    icon: Upload,
    label: "Document",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  post: {
    icon: MessageSquare,
    label: "Post",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  blog: {
    icon: Globe,
    label: "Blog",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  pdf: {
    icon: FileUp,
    label: "PDF",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
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
      <div className="overflow-hidden rounded-xl border border-border/50 bg-background">
        <div className="border-b border-border/30 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-12">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="ml-auto h-3 w-14" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/20 px-4 py-3.5 last:border-0"
          >
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-24 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-8 w-20" />
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
    <div className="overflow-hidden rounded-xl border border-border/50 bg-background">
      <Table>
        <TableHeader>
          <TableRow className="border-border/30 bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-xs font-semibold font-sans uppercase tracking-wider text-muted-foreground/70">
              Title
            </TableHead>
            <TableHead className="text-xs font-semibold font-sans uppercase tracking-wider text-muted-foreground/70">
              Source
            </TableHead>
            <TableHead className="text-xs font-semibold font-sans uppercase tracking-wider text-muted-foreground/70">
              Status
            </TableHead>
            <TableHead className="text-xs font-semibold font-sans uppercase tracking-wider text-muted-foreground/70">
              Created
            </TableHead>
            <TableHead className="text-right text-xs font-semibold font-sans uppercase tracking-wider text-muted-foreground/70">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => {
              const source =
                sourceTypeConfig[item.sourceType] || sourceTypeConfig.manual;
              const SourceIcon = source.icon;

              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.03,
                    ease: [0.25, 0.4, 0.25, 1],
                  }}
                  className="group border-b border-border/20 transition-colors duration-200 last:border-0 hover:bg-muted/30"
                >
                  <TableCell className="font-medium font-sans">
                    <span className="transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                      {item.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1",
                        source.bg
                      )}
                    >
                      <SourceIcon className={cn("h-3.5 w-3.5", source.color)} />
                      <span className={cn("text-xs font-medium font-sans", source.color)}>
                        {source.label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.isIndexed ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1">
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs font-medium font-sans text-emerald-600 dark:text-emerald-400">
                          Indexed
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium font-sans text-muted-foreground">
                          Pending
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-sans text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity duration-200 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-blue-700/10 hover:text-blue-700"
                        onClick={() => onEdit?.(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
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
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
