"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Camera, Loader2, Save } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface ProfileFormValues {
  name: string;
  bio: string;
  headline: string;
}

interface ProfileFormProps {
  initialData: {
    name: string;
    email: string;
    bio?: string | null;
    headline?: string | null;
    image?: string | null;
  };
  onSuccess?: () => void;
}

export function ProfileForm({ initialData, onSuccess }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [stage, setStage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const uploadedPhoto = useRef<{ file: File; url: string } | null>(null);
  const savedAvatar = useRef(initialData.image ?? null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData.image ?? null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: initialData.name,
      bio: initialData.bio ?? "",
      headline: initialData.headline ?? "",
    },
  });

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!avatarPreview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);
  useEffect(() => {
    if (!isDirty && !avatarFile) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, avatarFile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || inFlight.current) return;
    uploadedPhoto.current = null;
    setSaveError(null);
    setSaved(false);
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setAvatarFile(null);
      setAvatarPreview(savedAvatar.current);
      e.target.value = "";
      setSaveError("Choose a JPEG, PNG, GIF or WebP profile photo up to 2MB.");
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarFile(file);
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const request = new AbortController();
    controller.current = request;
    setIsSubmitting(true);
    setSaveError(null);
    setSaved(false);
    try {
      let imageUrl = uploadedPhoto.current?.file === avatarFile ? uploadedPhoto.current.url : undefined;
      if (avatarFile && !imageUrl) {
        setStage("Uploading profile photo…");
        const formData = new FormData();
        formData.append("file", avatarFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData, signal: request.signal });
        if (!uploadRes.ok) throw new Error("Profile photo could not be uploaded. Your photo and details are kept here; retry saving.");
        const uploadData = await uploadRes.json();
        if (typeof uploadData.url !== "string" || !uploadData.url) throw new Error("Profile photo upload could not be confirmed. Your changes are kept here.");
        imageUrl = uploadData.url;
        uploadedPhoto.current = { file: avatarFile, url: imageUrl! };
      }
      if (request.signal.aborted) return;
      setStage("Saving profile…");
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ...(imageUrl && { image: imageUrl }) }),
        signal: request.signal,
      });
      if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Your session cannot save this profile. Sign in again; your changes are kept here." : "Profile could not be saved. Your changes are kept here; retry saving.");
      if (request.signal.aborted) return;
      if (imageUrl) { savedAvatar.current = imageUrl; setAvatarPreview(imageUrl); }
      uploadedPhoto.current = null;
      setAvatarFile(null);
      reset(data);
      setSaved(true);
      toast.success("Profile updated successfully");
      onSuccess?.();
    } catch (error) {
      if (!request.signal.aborted) setSaveError(error instanceof Error && !["TypeError", "SyntaxError"].includes(error.name) ? error.message : "Save response could not be confirmed. Reload your profile before retrying an interrupted request.");
    } finally {
      inFlight.current = false;
      if (!request.signal.aborted) { setIsSubmitting(false); setStage(""); }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>
          Update your personal information and public profile.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="group relative">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={avatarPreview ?? undefined}
                  alt={initialData.name}
                />
                <AvatarFallback className="text-xl">
                  {getInitials(initialData.name)}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInput}
                id="avatar-upload"
                aria-label="Profile photo file"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                disabled={isSubmitting}
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="text-sm font-medium">Profile Photo</p>
              <p className="text-sm text-muted-foreground">JPEG, PNG, GIF or WebP up to 2MB.</p>
              <Button type="button" variant="outline" className="mt-2" disabled={isSubmitting} onClick={() => fileInput.current?.click()}><Camera aria-hidden="true" className="mr-2 h-4 w-4" />Choose profile photo</Button>
              {avatarFile ? <p className="mt-2 break-all text-sm">Selected: {avatarFile.name}</p> : null}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "profile-name-error" : undefined}
              placeholder="Your full name"
              {...register("name", {
                required: "Name is required",
                minLength: { value: 2, message: "Name must be at least 2 characters" },
              })}
            />
            {errors.name && (
              <p id="profile-name-error" role="alert" className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={initialData.email}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              disabled={isSubmitting}
              placeholder="A short tagline about yourself"
              {...register("headline")}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              disabled={isSubmitting}
              placeholder="Tell others about yourself..."
              className="min-h-[120px] resize-y"
              {...register("bio")}
            />
          </div>
        </CardContent>

        {saveError ? <p role="alert" className="mx-6 mb-4 text-sm text-destructive">{saveError}</p> : null}
        {stage ? <p role="status" className="mx-6 mb-4 text-sm">{stage}</p> : null}
        {saved && !isDirty && !avatarFile ? <p role="status" className="mx-6 mb-4 text-sm">Profile saved.</p> : null}
        {(isDirty || avatarFile) && !isSubmitting ? <p className="mx-6 mb-4 text-sm text-muted-foreground">You have unsaved profile changes.</p> : null}
        <CardFooter className="flex justify-end border-t pt-4">
          <Button type="submit" className="cursor-pointer" disabled={isSubmitting || (!isDirty && !avatarFile)}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? "Saving…" : saveError ? "Retry saving profile" : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
