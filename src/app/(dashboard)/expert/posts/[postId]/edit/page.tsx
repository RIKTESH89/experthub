"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface EditPostValues {
  title: string;
  content: string;
  isRagEnabled: boolean;
  isHidden: boolean;
}

interface PostData {
  id: string;
  title?: string | null;
  content: string;
  status: string;
  isRagEnabled: boolean;
  isHidden: boolean;
  tags: string[];
}

export default function ExpertEditPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<PostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const { register, handleSubmit, watch, setValue, reset } =
    useForm<EditPostValues>();

  const isRagEnabled = watch("isRagEnabled");
  const isHidden = watch("isHidden");

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${postId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setPost(data);
        setTags(data.tags || []);
        reset({
          title: data.title ?? "",
          content: data.content ?? "",
          isRagEnabled: data.isRagEnabled ?? false,
          isHidden: data.isHidden ?? false,
        });
      } catch {
        toast.error("Failed to load post");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPost();
  }, [postId, reset]);

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (tag && !tags.includes(tag) && tags.length < 10) {
        setTags((prev) => [...prev, tag]);
        setTagInput("");
      }
    }
  };

  const onSubmit = async (data: EditPostValues, status?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tags,
          ...(status ? { status } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Post updated successfully");
      router.push(`/expert/posts/${postId}`);
    } catch {
      toast.error("Failed to update post");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold">Post Not Found</h2>
        <Button className="mt-4" asChild>
          <Link href="/expert/posts">Back to Posts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/expert/posts/${postId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Post</h2>
          <p className="text-sm text-muted-foreground">
            Update your post content and settings
          </p>
        </div>
      </div>

      <Card>
        <form>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Title (optional)"
                {...register("title")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write your post content..."
                className="min-h-[250px] resize-y"
                {...register("content", { required: "Content is required" })}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() =>
                        setTags((prev) => prev.filter((t) => t !== tag))
                      }
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      &times;
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add tags (press Enter)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            </div>

            <Separator />

            {/* Toggles */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={isRagEnabled}
                  onCheckedChange={(v) => setValue("isRagEnabled", v)}
                />
                <Label>Include in Knowledge Base</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={isHidden}
                  onCheckedChange={(v) => setValue("isHidden", v)}
                />
                <Label>Hidden post</Label>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleSubmit((data) => onSubmit(data, "DRAFT"))}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit((data) => onSubmit(data, "PUBLISHED"))}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
