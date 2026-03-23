"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

export function KnowledgeForm({
  initialData,
  onSuccess,
  onCancel,
}: KnowledgeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<KnowledgeFormValues>({
    defaultValues: {
      title: initialData?.title ?? "",
      content: initialData?.content ?? "",
      sourceType: initialData?.sourceType ?? "manual",
    },
  });

  const sourceType = watch("sourceType");

  const onSubmit = async (data: KnowledgeFormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/knowledge/${initialData.id}`
        : "/api/knowledge";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(
        isEditing ? "Knowledge item updated" : "Knowledge item created"
      );
      onSuccess?.();
    } catch {
      toast.error("Failed to save knowledge item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Edit Knowledge Item" : "Add Knowledge Item"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title..."
              {...register("title", { required: "Title is required" })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceType">Source Type</Label>
            <Select
              value={sourceType}
              onValueChange={(value: "manual" | "document" | "post") =>
                setValue("sourceType", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="document">Document Upload</SelectItem>
                <SelectItem value="post">From Post</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Enter the knowledge content..."
              className="min-h-[200px] resize-y"
              {...register("content", { required: "Content is required" })}
            />
            {errors.content && (
              <p className="text-xs text-destructive">
                {errors.content.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditing ? "Update" : "Create"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
