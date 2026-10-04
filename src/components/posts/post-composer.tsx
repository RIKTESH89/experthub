"use client";

import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "motion/react";
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
  ChevronUp,
  ChevronDown,
  Hash,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
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
  const [isFocused, setIsFocused] = useState(false);
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

      const remaining = 5 - mediaFiles.length;
      if (remaining <= 0) {
        toast.error("Maximum 5 media files per post");
        return;
      }
      const filesToAdd = validFiles.slice(0, remaining);
      if (filesToAdd.length < validFiles.length) {
        toast.info(`Only ${remaining} more file${remaining !== 1 ? "s" : ""} allowed. Some files were skipped.`);
      }

      const newMedia: MediaFile[] = filesToAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        type,
        preview: URL.createObjectURL(file),
      }));
      setMediaFiles((prev) => [...prev, ...newMedia]);
    },
    [mediaFiles.length]
  );

  const removeMedia = useCallback((id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const moveMedia = useCallback((fromIndex: number, toIndex: number) => {
    setMediaFiles((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
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
      setIsFocused(false);
      onPostCreated?.();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className={cn(
        "overflow-hidden border-border/50 bg-card transition-all duration-200",
        isFocused && "border-primary/20 ring-1 ring-primary/10"
      )}>
        <form>
          <CardContent className="space-y-4 p-5">
            {/* Author row + Title */}
            <div className="flex items-start gap-3">
              <Avatar className="mt-1 h-10 w-10 ring-1 ring-border">
                <AvatarImage src={authorImage ?? undefined} alt={authorName} />
                <AvatarFallback className="bg-primary/10 text-sm font-semibold font-sans text-primary">
                  {getInitials(authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  aria-label="Post title (optional)"
                  placeholder="Title (optional)"
                  className="h-auto border-0 bg-transparent px-0 py-1 text-lg font-semibold font-sans tracking-tight placeholder:text-muted-foreground focus-visible:ring-0"
                  {...register("title")}
                  onFocus={() => setIsFocused(true)}
                />
                <textarea
                  aria-label="Post content"
                  placeholder="Share your thoughts, insights, or expertise..."
                  className="w-full resize-none border-0 bg-transparent text-sm font-sans leading-relaxed placeholder:text-muted-foreground focus:outline-none"
                  style={{ minHeight: "120px" }}
                  {...register("content", {
                    onChange: autoResize,
                  })}
                  ref={(e) => {
                    register("content").ref(e);
                    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                  }}
                  onFocus={() => setIsFocused(true)}
                />
              </div>
            </div>

            {/* Media preview grid */}
            <AnimatePresence mode="popLayout">
              {mediaFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {mediaFiles.map((mf, index) => (
                      <motion.div
                        key={mf.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="group relative overflow-hidden rounded-xl ring-1 ring-border/30"
                      >
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
                            <span className="ml-2 max-w-[100px] truncate text-xs font-sans text-muted-foreground">
                              {mf.file.name}
                            </span>
                          </div>
                        )}
                        {/* Order badge */}
                        <div className="absolute left-1.5 top-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold font-sans text-white">
                            {index + 1}
                          </span>
                        </div>
                        {/* Controls overlay */}
                        <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            disabled={index === 0}
                            aria-label="Move media earlier"
                            onClick={() => moveMedia(index, index - 1)}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors duration-200 hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === mediaFiles.length - 1}
                            aria-label="Move media later"
                            onClick={() => moveMedia(index, index + 1)}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors duration-200 hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove media"
                            onClick={() => removeMedia(mf.id)}
                            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-red-500/80 text-white transition-colors duration-200 hover:bg-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${(mediaFiles.length / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium font-sans text-muted-foreground">
                      {mediaFiles.length}/5
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tags display */}
            <AnimatePresence>
              {tags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex flex-wrap gap-1.5"
                >
                  {tags.map((tag) => (
                    <motion.div
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      layout
                    >
                      <Badge
                        variant="secondary"
                        className="gap-1 rounded-full border-transparent bg-primary/[0.06] pr-1.5 text-xs font-normal font-sans text-primary/80 transition-colors duration-200 hover:bg-primary/10 dark:bg-primary/10 dark:text-primary"
                      >
                        #{tag}
                        <button
                          type="button"
                          aria-label={`Remove tag ${tag}`}
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 cursor-pointer rounded-full p-0.5 transition-colors duration-200 hover:bg-primary/20"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tag input */}
            <div className="relative">
              <Hash className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Post tags"
                placeholder="Add tags (press Enter)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                onFocus={() => setIsFocused(true)}
                className="border-0 bg-transparent pl-6 text-sm font-sans placeholder:text-muted-foreground focus-visible:ring-0"
              />
            </div>

            <Separator className="bg-border/40" />

            {/* Toggle options */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200",
                  isRagEnabled ? "bg-primary/[0.06]" : "hover:bg-muted"
                )}
              >
                <Label
                  htmlFor="rag-toggle"
                  className="flex cursor-pointer items-center gap-2 text-sm font-sans"
                >
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
                    isRagEnabled ? "bg-primary/15 text-primary dark:text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Brain className="h-3.5 w-3.5" />
                  </div>
                  <span className={cn(isRagEnabled && "font-medium text-primary dark:text-primary")}>Knowledge Base</span>
                </Label>
                <Switch
                  id="rag-toggle"
                  checked={isRagEnabled}
                  onCheckedChange={(checked) => setValue("isRagEnabled", checked)}
                />
              </div>

              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200",
                  isHidden ? "bg-muted-foreground/[0.06]" : "hover:bg-muted"
                )}
              >
                <Label
                  htmlFor="hidden-toggle"
                  className="flex cursor-pointer items-center gap-2 text-sm font-sans"
                >
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
                    isHidden ? "bg-muted-foreground/15 text-muted-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <EyeOff className="h-3.5 w-3.5" />
                  </div>
                  <span className={cn(isHidden && "font-medium")}>Hidden</span>
                </Label>
                <Switch
                  id="hidden-toggle"
                  checked={isHidden}
                  onCheckedChange={(checked) => setValue("isHidden", checked)}
                />
              </div>

              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200",
                  isPremiumOnly ? "bg-amber-500/[0.06]" : "hover:bg-muted"
                )}
              >
                <Label
                  htmlFor="premium-toggle"
                  className="flex cursor-pointer items-center gap-2 text-sm font-sans"
                >
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
                    isPremiumOnly ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
                  )}>
                    <Crown className="h-3.5 w-3.5" />
                  </div>
                  <span className={cn(isPremiumOnly && "font-medium text-amber-600 dark:text-amber-400")}>Premium</span>
                </Label>
                <Switch
                  id="premium-toggle"
                  checked={isPremiumOnly}
                  onCheckedChange={(checked) => setValue("isPremiumOnly", checked)}
                />
              </div>
            </div>

            {/* Info messages */}
            <AnimatePresence>
              {isHidden && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-xs font-sans text-foreground"
                >
                  <EyeOff className="h-3 w-3 shrink-0" />
                  This post will only be added to your knowledge base and won&apos;t appear in feeds.
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isPremiumOnly && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500/[0.06] px-3 py-2 text-xs font-sans text-amber-600 dark:text-amber-400"
                >
                  <Crown className="h-3 w-3 shrink-0" />
                  Only Premium subscribers can see this post.
                </motion.p>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-border/40 bg-card px-5 py-3">
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5">
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
                      className="h-9 w-9 cursor-pointer rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
                      disabled={mediaFiles.length >= 5}
                      aria-label="Add images"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Add image (max 2MB)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 cursor-pointer rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
                      disabled={mediaFiles.length >= 5}
                      aria-label="Add video"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Add video (max 10MB)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 cursor-pointer rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
                      disabled={mediaFiles.length >= 5}
                      aria-label="Add audio"
                      onClick={() => audioInputRef.current?.click()}
                    >
                      <Music className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Add audio (max 3MB)</TooltipContent>
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
                className="cursor-pointer rounded-lg border-border/50 transition-colors duration-200 hover:border-border hover:bg-muted/80"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Draft
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
                onClick={handleSubmit((data) => onSubmit(data, "PUBLISHED"))}
                className="cursor-pointer rounded-lg bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary disabled:opacity-50"
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
    </motion.div>
  );
}
