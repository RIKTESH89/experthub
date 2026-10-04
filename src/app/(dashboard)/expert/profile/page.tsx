"use client";

import { ExpertStudio } from "@/components/expert-studio/expert-studio";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import {
  Camera,
  Loader2,
  Save,
  X,
  User,
  Sparkles,
  DollarSign,
  Link2,
  Twitter,
  Linkedin,
  Globe,
  Mail,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  PageTransition,
  FadeIn,
  motion,
  AnimatePresence,
} from "@/components/ui/motion";

interface ExpertProfileValues {
  name: string;
  displayName: string;
  headline: string;
  bio: string;
  monthlyPrice: string;
  twitterUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
}

interface ExpertProfileData {
  name: string;
  email: string;
  image?: string | null;
  displayName?: string;
  headline?: string | null;
  bio?: string | null;
  specialty: string[];
  monthlyPrice: number;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  } | null;
}

function ExpertProfilePageContent() {
  useSession();
  const [profile, setProfile] = useState<ExpertProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specInput, setSpecInput] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { },
  } = useForm<ExpertProfileValues>();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/expert/profile");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProfile(data);
        setSpecialties(data.specialty || []);
        setAvatarPreview(data.image);
        reset({
          name: data.name ?? "",
          displayName: data.displayName ?? "",
          headline: data.headline ?? "",
          bio: data.bio ?? "",
          monthlyPrice: String(data.monthlyPrice ?? "9.99"),
          twitterUrl: data.socialLinks?.twitter ?? "",
          linkedinUrl: data.socialLinks?.linkedin ?? "",
          websiteUrl: data.socialLinks?.website ?? "",
        });
      } catch {
        setLoadError(true);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [reset]);

  const addSpecialty = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const spec = specInput.trim();
      if (spec && !specialties.includes(spec) && specialties.length < 8) {
        setSpecialties((prev) => [...prev, spec]);
        setSpecInput("");
      }
    }
  };

  const onSubmit = async (data: ExpertProfileValues) => {
    setIsSubmitting(true);
    try {
      // Upload avatar if a new file was selected
      let imageUrl: string | undefined;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } else {
          toast.error("Failed to upload profile photo");
        }
      }

      const res = await fetch("/api/expert/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          monthlyPrice: parseFloat(data.monthlyPrice),
          specialty: specialties,
          socialLinks: {
            twitter: data.twitterUrl || undefined,
            linkedin: data.linkedinUrl || undefined,
            website: data.websiteUrl || undefined,
          },
          ...(imageUrl && { image: imageUrl }),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setAvatarFile(null);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) return <div role="alert" className="space-y-4 rounded-lg border bg-card p-6"><h1>Profile unavailable</h1><p className="text-muted-foreground">We could not load your saved information. Refresh before making changes.</p><Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button></div>;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Premium Profile Header */}
        <FadeIn delay={0.05}>
          <div className="relative overflow-hidden rounded-2xl border border-primary/60 bg-gradient-to-br from-primary via-primary/80 to-primary/60">
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <div className="flex items-center gap-5">
                {/* Avatar with upload overlay */}
                <div className="group relative shrink-0">
                  <div className="rounded-full bg-primary p-[3px] ">
                    <Avatar className="h-20 w-20 border-[3px] border-white">
                      <AvatarImage
                        src={avatarPreview ?? undefined}
                        alt={profile?.name ?? ""}
                      />
                      <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                        {getInitials(profile?.name ?? "E")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/0 transition-all duration-300 group-hover:bg-black/40"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileHover={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100"
                    >
                      <Camera className="h-5 w-5 text-primary-foreground drop-shadow-md" />
                      <span className="text-[10px] font-medium text-primary-foreground drop-shadow-md">
                        Edit
                      </span>
                    </motion.div>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Profile photo must be under 2MB");
                          return;
                        }
                        setAvatarPreview(URL.createObjectURL(file));
                        setAvatarFile(file);
                      }
                    }}
                  />
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-[3px] border-white bg-emerald-400 shadow-sm" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Expert Profile
                  </h1>
                  <p className="mt-0.5 text-sm text-primary/70">
                    Your public presence -- how subscribers see you
                  </p>
                  {profile?.email && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {profile.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Info */}
          <FadeIn delay={0.1}>
            <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription className="text-xs">
                      Your public profile visible to subscribers
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      {...register("name", { required: true })}
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-sm font-medium">
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      {...register("displayName", { required: true })}
                      className="transition-all focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headline" className="text-sm font-medium">
                    Headline
                  </Label>
                  <Input
                    id="headline"
                    placeholder="e.g., AI Researcher & Machine Learning Expert"
                    {...register("headline")}
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-medium">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell subscribers about your expertise..."
                    className="min-h-[120px] resize-y transition-all focus:ring-2 focus:ring-primary/20"
                    {...register("bio")}
                  />
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input
                    value={profile?.email ?? ""}
                    disabled
                    className="bg-muted/80 text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Specialty Tags */}
          <FadeIn delay={0.15}>
            <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent pointer-events-none" />
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle>Specialties</CardTitle>
                    <CardDescription className="text-xs">
                      Tags that describe your areas of expertise (max 8)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <AnimatePresence>
                  {specialties.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-wrap gap-2"
                    >
                      {specialties.map((spec) => (
                        <motion.div
                          key={spec}
                          initial={{ opacity: 0, scale: 0.8, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Badge
                            variant="secondary"
                            className="group/tag gap-1.5 rounded-full border border-primary/60 bg-primary/10 px-3 py-1.5 text-sm text-primary transition-all hover:bg-primary hover:shadow-sm"
                          >
                            <Sparkles className="h-3 w-3 text-primary" />
                            {spec}
                            <button
                              type="button"
                              onClick={() =>
                                setSpecialties((prev) =>
                                  prev.filter((s) => s !== spec)
                                )
                              }
                              className="ml-0.5 rounded-full p-0.5 text-primary cursor-pointer transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="relative">
                  <Input
                    placeholder="Type a specialty and press Enter..."
                    value={specInput}
                    onChange={(e) => setSpecInput(e.target.value)}
                    onKeyDown={addSpecialty}
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                  {specialties.length > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {specialties.length}/8
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Pricing */}
          <FadeIn delay={0.2}>
            <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none" />
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>Pricing</CardTitle>
                    <CardDescription className="text-xs">
                      Set your monthly subscription price
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label htmlFor="monthlyPrice" className="text-sm font-medium">
                    Monthly Price
                  </Label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="monthlyPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-7 font-medium transition-all focus:ring-2 focus:ring-primary/20"
                      {...register("monthlyPrice", { required: true })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      /month
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the amount subscribers will pay per month for access to
                    your Digital Twin and exclusive content.
                  </p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Social Links */}
          <FadeIn delay={0.25}>
            <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-gray-200/60">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <Link2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Social Links</CardTitle>
                    <CardDescription className="text-xs">
                      Connect your social profiles so subscribers can find you
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="twitterUrl" className="text-sm font-medium">
                    Twitter / X
                  </Label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="twitterUrl"
                      placeholder="https://twitter.com/username"
                      className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                      {...register("twitterUrl")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="text-sm font-medium">
                    LinkedIn
                  </Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="linkedinUrl"
                      placeholder="https://linkedin.com/in/username"
                      className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                      {...register("linkedinUrl")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl" className="text-sm font-medium">
                    Website
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="websiteUrl"
                      placeholder="https://yourwebsite.com"
                      className="pl-9 transition-all focus:ring-2 focus:ring-primary/20"
                      {...register("websiteUrl")}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer gap-2 bg-primary px-6  transition-all duration-200 hover:bg-primary/90 "
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Profile
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </FadeIn>
        </form>
      </div>
    </PageTransition>
  );
}

export default function ExpertProfilePage() {
  return <ExpertStudio section="profile"><ExpertProfilePageContent /></ExpertStudio>;
}
