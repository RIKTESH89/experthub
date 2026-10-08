"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save, FileText, Upload, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface KnowledgeFormValues {
  title: string;
  content: string;
  sourceType: "manual" | "document" | "post";
}

interface KnowledgeFormProps {
  initialData?: {
    id: string;
    title: string;
    content: string;
    sourceType: "manual" | "document" | "post";
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const sourceTypeOptions = [
  { value: "manual", label: "Manual Entry", icon: FileText, color: "text-primary dark:text-primary" },
  { value: "document", label: "Document Upload", icon: Upload, color: "text-primary" },
  { value: "post", label: "From Post", icon: MessageSquare, color: "text-green-500" },
];

export function KnowledgeForm({
  initialData,
  onSuccess,
  onCancel,
}: KnowledgeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => () => requestRef.current?.abort(), []);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<KnowledgeFormValues>({
    defaultValues: {
      title: initialData?.title ?? "",
      content: initialData?.content ?? "",
      sourceType: initialData?.sourceType ?? "manual",
    },
  });

  const sourceType = watch("sourceType");
  const currentSource = sourceTypeOptions.find((s) => s.value === sourceType);

  const onSubmit = async (data: KnowledgeFormValues) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const request = new AbortController();
    requestRef.current = request;
    setIsSubmitting(true);
    setSaveError(null);
    setSaved(false);
    try {
      const url = isEditing
        ? `/api/knowledge/${initialData.id}`
        : "/api/knowledge";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: request.signal,
      });

      if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Your expert session cannot save this knowledge item. Your draft is kept here." : "Knowledge item could not be saved. Your draft is kept here; try again.");
      if (request.signal.aborted) return;
      reset(data);
      setSaved(true);

      toast.success(
        isEditing ? "Knowledge item updated" : "Knowledge item created"
      );
      onSuccess?.();
    } catch (error) {
      if (!request.signal.aborted) setSaveError(error instanceof Error && !["TypeError", "SyntaxError"].includes(error.name) ? error.message : "Save response could not be confirmed. Check your library before retrying an interrupted save.");
    } finally {
      inFlight.current = false;
      if (!request.signal.aborted) setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
    >
      <Card className="overflow-hidden border-border/50">
        {/* Header accent line */}
        <div className="h-1 bg-primary" />

        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary dark:text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold font-sans tracking-tight">
                {isEditing ? "Edit Knowledge Item" : "Add Knowledge Item"}
              </CardTitle>
              <p className="mt-0.5 text-xs font-sans text-muted-foreground">
                {isEditing
                  ? "Update the details of your knowledge entry"
                  : "Add new content to power your AI twin"}
              </p>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
          <CardContent className="space-y-5">
            {/* Title field */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="space-y-2"
            >
              <Label
                htmlFor="title"
                className="text-sm font-medium font-sans text-foreground"
              >
                Title
              </Label>
              <Input
                id="title"
                disabled={isSubmitting}
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "knowledge-title-error" : undefined}
                placeholder="Enter a descriptive title..."
                className={cn(
                  "h-11 rounded-lg border-border/50 bg-card px-4 font-sans transition-all duration-200",
                  "placeholder:text-muted-foreground",
                  "focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10",
                  errors.title && "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/10"
                )}
                {...register("title", { required: "Title is required", validate: value => !!value.trim() || "Title is required" })}
              />
              {errors.title && (
                <motion.p id="knowledge-title-error" role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-medium font-sans text-destructive"
                >
                  {errors.title.message}
                </motion.p>
              )}
            </motion.div>

            {/* Source Type field */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="space-y-2"
            >
              <Label
                htmlFor="sourceType"
                className="text-sm font-medium font-sans text-foreground"
              >
                Source Type
              </Label>
              <Select disabled={isSubmitting}
                value={sourceType}
                onValueChange={(value: "manual" | "document" | "post") =>
                  setValue("sourceType", value, { shouldDirty: true, shouldValidate: true })
                }
              >
                <SelectTrigger id="sourceType"
                  className={cn(
                    "h-11 cursor-pointer rounded-lg border-border/50 bg-card font-sans transition-all duration-200",
                    "focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {currentSource && (
                      <currentSource.icon
                        className={cn("h-4 w-4", currentSource.color)}
                      />
                    )}
                    <SelectValue placeholder="Select source type" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border/50">
                  {sourceTypeOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="cursor-pointer rounded-md font-sans"
                    >
                      <div className="flex items-center gap-2">
                        <option.icon className={cn("h-4 w-4", option.color)} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Content field */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="space-y-2"
            >
              <Label
                htmlFor="content"
                className="text-sm font-medium font-sans text-foreground"
              >
                Content
              </Label>
              <Textarea
                id="content"
                disabled={isSubmitting}
                aria-invalid={!!errors.content}
                aria-describedby={errors.content ? "knowledge-content-error" : undefined}
                placeholder="Enter the knowledge content..."
                className={cn(
                  "min-h-[200px] resize-y rounded-lg border-border/50 bg-card px-4 py-3 font-sans transition-all duration-200",
                  "placeholder:text-muted-foreground",
                  "focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/10",
                  errors.content && "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/10"
                )}
                {...register("content", { required: "Content is required", validate: value => !!value.trim() || "Content is required" })}
              />
              {errors.content && (
                <motion.p id="knowledge-content-error" role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-medium font-sans text-destructive"
                >
                  {errors.content.message}
                </motion.p>
              )}
            </motion.div>
          </CardContent>

          {saveError ? <p role="alert" className="mx-6 mb-4 text-sm text-destructive">{saveError}</p> : null}
          {saved ? <p role="status" className="mx-6 mb-4 text-sm">Knowledge item saved.</p> : null}
          {isSubmitting ? <p role="status" className="mx-6 mb-4 text-sm">Saving knowledge item…</p> : null}
          <CardFooter className="flex justify-end gap-2.5 border-t border-border/30 bg-card px-6 py-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg border-border/50 px-5 font-sans transition-colors duration-200 hover:bg-muted"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || (saved && !isDirty)}
              className="cursor-pointer rounded-lg bg-primary px-6 font-sans text-primary-foreground transition-colors duration-200 hover:bg-primary"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Saving…" : saveError ? "Retry saving knowledge" : isEditing ? "Update" : "Create"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
