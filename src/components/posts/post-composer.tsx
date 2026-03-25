"use client";

import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import {
  ImagePlus,
  Video,
  Music,
  X,
  Brain,
  EyeOff,
  Crown,
  Loader2,
  Send,
  Save,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface MediaFile {
  id: string;
  file: File;
  type: "IMAGE" | "VIDEO" | "AUDIO";
  preview: string;
}

interface PostFormValues {
  title: string;
  content: string;
  isRagEnabled: boolean;
  isHidden: boolean;
  isPremiumOnly: boolean;
}

interface PostComposerProps {
  authorName: string;
  authorImage?: string | null;
  onPostCreated?: () => void;
}

export function PostComposer({
  authorName,
  authorImage,
  onPostCreated,
}: PostComposerProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm<PostFormValues>({
    defaultValues: {
      title: "",
      content: "",
      isRagEnabled: false,
      isHidden: false,
      isPremiumOnly: false,
    },
  });

  const isRagEnabled = watch("isRagEnabled");
  const isHidden = watch("isHidden");
  const isPremiumOnly = watch("isPremiumOnly");
  const content = watch("content");

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
    }
  }, []);

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

      if (validFiles.length === 0) return;

      const newMedia: MediaFile[] = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        type,
        preview: URL.createObjectURL(file),
      }));
      setMediaFiles((prev) => [...prev, ...newMedia]);
    },
    []
  );

  const removeMedia = useCallback((id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const addTag = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
        if (tag && !tags.includes(tag) && tags.length < 10) {
          setTags((prev) => [...prev, tag]);
          setTagInput("");
        }
      }
    },
    [tagInput, tags]
  );

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const onSubmit = async (data: PostFormValues, status: "DRAFT" | "PUBLISHED") => {
    if (!data.content.trim() && mediaFiles.length === 0) {
      toast.error("Please add some content or media");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload media files one at a time and collect URLs
      const mediaPayload: { type: string; url: string; order: number }[] = [];
      for (let i = 0; i < mediaFiles.length; i++) {
        const mf = mediaFiles[i];
        const uploadForm = new FormData();
        uploadForm.append("file", mf.file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadForm,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload media");
        const uploadData = await uploadRes.json();
        mediaPayload.push({ type: mf.type, url: uploadData.url, order: i });
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          status,
          isRagEnabled: data.isRagEnabled,
          isHidden: data.isHidden,
          isPremiumOnly: data.isPremiumOnly,
          tags,
          media: mediaPayload,
        }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      toast.success(
        status === "DRAFT" ? "Draft saved" : "Post published!"
      );
      reset();
      setMediaFiles([]);
      setTags([]);
      onPostCreated?.();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <form>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <Avatar className="mt-1 h-10 w-10">
              <AvatarImage src={authorImage ?? undefined} alt={authorName} />
              <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-3">
              <Input
                placeholder="Title (optional)"
                className="border-0 bg-transparent px-0 text-lg font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0"
                {...register("title")}
              />
              <textarea
                placeholder="What's on your mind?"
                className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none"
                style={{ minHeight: "120px" }}
                {...register("content", {
                  onChange: autoResize,
                })}
                ref={(e) => {
                  register("content").ref(e);
                  (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                }}
              />
            </div>
          </div>

          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {mediaFiles.map((mf) => (
                <div key={mf.id} className="group relative overflow-hidden rounded-lg">
                  {mf.type === "IMAGE" ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={mf.preview}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-muted">
                      {mf.type === "VIDEO" ? (
                        <Video className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <Music className="h-8 w-8 text-muted-foreground" />
                      )}
                      <span className="ml-2 truncate text-xs text-muted-foreground">
                        {mf.file.name}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(mf.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Input
            placeholder="Add tags (press Enter)..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
            className="border-0 bg-transparent px-0 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="rag-toggle"
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Brain className="h-4 w-4 text-primary" />
                Include in Knowledge Base
              </Label>
              <Switch
                id="rag-toggle"
                checked={isRagEnabled}
                onCheckedChange={(checked) => setValue("isRagEnabled", checked)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label
                htmlFor="hidden-toggle"
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                Hidden post
              </Label>
              <Switch
                id="hidden-toggle"
                checked={isHidden}
                onCheckedChange={(checked) => setValue("isHidden", checked)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label
                htmlFor="premium-toggle"
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Crown className="h-4 w-4 text-amber-500" />
                Premium Only
              </Label>
              <Switch
                id="premium-toggle"
                checked={isPremiumOnly}
                onCheckedChange={(checked) => setValue("isPremiumOnly", checked)}
              />
            </div>
          </div>

          {isHidden && (
            <p className="text-xs text-muted-foreground">
              This post will only be added to your knowledge base and won&apos;t appear in feeds.
            </p>
          )}

          {isPremiumOnly && (
            <p className="text-xs text-muted-foreground">
              Only Premium subscribers can see this post.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addMedia(e.target.files, "IMAGE")}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => addMedia(e.target.files, "VIDEO")}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => addMedia(e.target.files, "AUDIO")}
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-primary"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add image</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-primary"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add video</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-primary"
                    onClick={() => audioInputRef.current?.click()}
                  >
                    <Music className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add audio</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit((data) => onSubmit(data, "DRAFT"))}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Draft
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
              onClick={handleSubmit((data) => onSubmit(data, "PUBLISHED"))}
            >
              {isSubmitting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              Publish
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
