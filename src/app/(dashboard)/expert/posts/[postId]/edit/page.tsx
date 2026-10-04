"use client";

import { ExpertStudio } from "@/components/expert-studio/expert-studio";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  X,
  ChevronUp,
  ChevronDown,
  ImagePlus,
  Video,
  Music,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface EditPostValues {
  title: string;
  content: string;
  isRagEnabled: boolean;
  isHidden: boolean;
  isPremiumOnly: boolean;
}

interface ExistingMedia {
  id: string;
  type: "TEXT" | "VIDEO" | "AUDIO" | "IMAGE";
  url: string;
  thumbnail?: string | null;
  duration?: number | null;
  order: number;
}

// Unified media item — either existing (has url) or new (has file)
interface MediaItem {
  id: string;
  type: "IMAGE" | "VIDEO" | "AUDIO";
  url?: string; // existing media from server
  file?: File; // new file to upload
  preview: string;
}

interface PostData {
  id: string;
  title?: string | null;
  content: string;
  status: string;
  isRagEnabled: boolean;
  isHidden: boolean;
  isPremiumOnly?: boolean;
  tags: string[];
  media: ExistingMedia[];
}

function ExpertEditPostPageContent() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<PostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, reset } =
    useForm<EditPostValues>();

  const isRagEnabled = watch("isRagEnabled");
  const isHidden = watch("isHidden");
  const isPremiumOnly = watch("isPremiumOnly");

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${postId}`);
        if (res.status === 404) { setPost(null); return; }
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setPost(data);
        setTags(data.tags || []);
        reset({
          title: data.title ?? "",
          content: data.content ?? "",
          isRagEnabled: data.isRagEnabled ?? false,
          isHidden: data.isHidden ?? false,
          isPremiumOnly: data.isPremiumOnly ?? false,
        });

        // Load existing media
        const existing: MediaItem[] = (data.media || [])
          .sort((a: ExistingMedia, b: ExistingMedia) => a.order - b.order)
          .map((m: ExistingMedia) => ({
            id: m.id,
            type: m.type === "TEXT" ? "IMAGE" : m.type,
            url: m.url,
            preview: m.url,
          }));
        setMediaItems(existing);
      } catch {
        setLoadError(true);
        toast.error("Failed to load post");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPost();
  }, [postId, reset]);

  const addMedia = useCallback(
    (files: FileList | null, type: "IMAGE" | "VIDEO" | "AUDIO") => {
      if (!files) return;

      const sizeLimits: Record<string, { max: number; label: string }> = {
        IMAGE: { max: 2 * 1024 * 1024, label: "2MB" },
        VIDEO: { max: 10 * 1024 * 1024, label: "10MB" },
        AUDIO: { max: 3 * 1024 * 1024, label: "3MB" },
      };

      const limit = sizeLimits[type];
      const validFiles: File[] = [];

      for (const file of Array.from(files)) {
        if (file.size > limit.max) {
          toast.error(`${file.name} exceeds ${limit.label} limit for ${type.toLowerCase()} files`);
        } else {
          validFiles.push(file);
        }
      }

      const remaining = 5 - mediaItems.length;
      if (remaining <= 0) {
        toast.error("Maximum 5 media files per post");
        return;
      }
      const filesToAdd = validFiles.slice(0, remaining);
      if (filesToAdd.length < validFiles.length) {
        toast.info(`Only ${remaining} more file${remaining !== 1 ? "s" : ""} allowed`);
      }

      if (filesToAdd.length === 0) return;

      const newMedia: MediaItem[] = filesToAdd.map((file) => ({
        id: crypto.randomUUID(),
        type,
        file,
        preview: URL.createObjectURL(file),
      }));
      setMediaItems((prev) => [...prev, ...newMedia]);
    },
    [mediaItems.length]
  );

  const removeMedia = useCallback((id: string) => {
    setMediaItems((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.file) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const moveMedia = useCallback((fromIndex: number, toIndex: number) => {
    setMediaItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

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
      // Upload new media files and build the final media payload
      const mediaPayload: { type: string; url: string; order: number; thumbnail?: string; duration?: number }[] = [];

      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];

        if (item.file) {
          // New file — upload to S3
          const uploadForm = new FormData();
          uploadForm.append("file", item.file);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadForm });
          if (!uploadRes.ok) throw new Error("Failed to upload media");
          const uploadData = await uploadRes.json();
          mediaPayload.push({ type: item.type, url: uploadData.url, order: i });
        } else if (item.url) {
          // Existing file — keep the URL
          mediaPayload.push({ type: item.type, url: item.url, order: i });
        }
      }

      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tags,
          media: mediaPayload,
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

  if (loadError) return <section role="alert" className="space-y-4 rounded-lg border bg-card p-6"><h1>Post unavailable</h1><p className="text-muted-foreground">We could not load this post. Refresh to try again.</p><Button variant="outline" onClick={() => window.location.reload()}>Refresh post</Button><Link className="ml-4 underline" href="/expert/posts">Back to posts</Link></section>;

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
        <h1 className="text-lg font-semibold">Post Not Found</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Edit Post</h1>
          <p className="text-sm text-muted-foreground">
            Update your post content, media, and settings
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
                className="min-h-[200px] resize-y"
                {...register("content", { required: "Content is required" })}
              />
            </div>

            {/* Media Section */}
            <div className="space-y-3">
              <Label>Media ({mediaItems.length}/5)</Label>

              {mediaItems.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {mediaItems.map((item, index) => (
                    <div key={item.id} className="group relative overflow-hidden rounded-lg border border-border">
                      {item.type === "IMAGE" ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.preview}
                          alt=""
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-muted">
                          {item.type === "VIDEO" ? (
                            <Video className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <Music className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      )}

                      {/* Position badge */}
                      <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>

                      {/* Controls overlay */}
                      <div className="absolute right-1 top-1 flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
                        {index > 0 && (
                          <button
                            type="button"
                            aria-label="Move media earlier"
                            onClick={() => moveMedia(index, index - 1)}
                            className="rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {index < mediaItems.length - 1 && (
                          <button
                            type="button"
                            aria-label="Move media later"
                            onClick={() => moveMedia(index, index + 1)}
                            className="rounded bg-black/60 p-0.5 text-white hover:bg-black/80"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Remove media"
                          onClick={() => removeMedia(item.id)}
                          className="rounded bg-black/60 p-0.5 text-white hover:bg-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add media buttons */}
              <div className="flex items-center gap-1">
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addMedia(e.target.files, "IMAGE")} />
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => addMedia(e.target.files, "VIDEO")} />
                <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => addMedia(e.target.files, "AUDIO")} />

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline" size="sm" disabled={mediaItems.length >= 5} onClick={() => imageInputRef.current?.click()}>
                        <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Image
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add image (max 2MB)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline" size="sm" disabled={mediaItems.length >= 5} onClick={() => videoInputRef.current?.click()}>
                        <Video className="mr-1.5 h-3.5 w-3.5" /> Video
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add video (max 10MB)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline" size="sm" disabled={mediaItems.length >= 5} onClick={() => audioInputRef.current?.click()}>
                        <Music className="mr-1.5 h-3.5 w-3.5" /> Audio
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add audio (max 3MB)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
              <div className="flex items-center gap-3">
                <Switch
                  checked={isPremiumOnly}
                  onCheckedChange={(v) => setValue("isPremiumOnly", v)}
                />
                <Label>Premium Only</Label>
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

export default function ExpertEditPostPage() {
  return <ExpertStudio section="posts/[postId]/edit"><ExpertEditPostPageContent /></ExpertStudio>;
}
