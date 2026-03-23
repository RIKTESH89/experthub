"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { Camera, Loader2, Save, X } from "lucide-react";
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

export default function ExpertProfilePage() {
  useSession();
  const [profile, setProfile] = useState<ExpertProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specInput, setSpecInput] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-indigo-900">Expert Profile</h2>
          <p className="mt-1 text-sm text-indigo-600/70">
            Your public presence
          </p>
        </div>
        <svg className="hidden sm:block" width="140" height="100" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Profile card */}
          <rect x="10" y="10" width="75" height="80" rx="10" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
          {/* Avatar */}
          <circle cx="47" cy="38" r="16" fill="#ddd6fe" stroke="#6366f1" strokeWidth="1.5" />
          <circle cx="47" cy="33" r="6" fill="#6366f1" opacity="0.6" />
          <path d="M35 50C35 43 40 39 47 39C54 39 59 43 59 50" fill="#6366f1" opacity="0.4" />
          {/* Name and headline lines */}
          <rect x="27" y="62" width="40" height="4" rx="2" fill="#ddd6fe" />
          <rect x="32" y="72" width="30" height="3" rx="1.5" fill="#e0e7ff" />
          {/* Verification badge */}
          <circle cx="68" cy="24" r="10" fill="#6366f1" />
          <path d="M63 24L66.5 27.5L73 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Stars */}
          <path d="M105 18L107.5 24L114 24L109 28L110.5 34L105 30.5L99.5 34L101 28L96 24L102.5 24Z" fill="#8b5cf6" opacity="0.6" />
          <path d="M120 45L121.5 49L125 49L122 51.5L123 55L120 52.5L117 55L118 51.5L115 49L118.5 49Z" fill="#6366f1" opacity="0.35" />
          <path d="M100 60L101.5 64L105 64L102 66.5L103 70L100 67.5L97 70L98 66.5L95 64L98.5 64Z" fill="#8b5cf6" opacity="0.25" />
          {/* Sparkle accent */}
          <circle cx="125" cy="30" r="3" fill="#8b5cf6" opacity="0.3" />
          <circle cx="112" cy="72" r="2" fill="#6366f1" opacity="0.2" />
        </svg>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your public profile visible to subscribers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="group relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={avatarPreview ?? undefined}
                    alt={profile?.name ?? ""}
                  />
                  <AvatarFallback className="text-xl">
                    {getInitials(profile?.name ?? "E")}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Camera className="h-5 w-5 text-white" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAvatarPreview(URL.createObjectURL(file));
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">
                  Click the avatar to upload a new photo
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...register("name", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  {...register("displayName", { required: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                placeholder="e.g., AI Researcher & Machine Learning Expert"
                {...register("headline")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell subscribers about your expertise..."
                className="min-h-[120px] resize-y"
                {...register("bio")}
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Specialty Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Specialties</CardTitle>
            <CardDescription>
              Tags that describe your areas of expertise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {specialties.map((spec) => (
                <Badge key={spec} variant="secondary" className="gap-1 pr-1">
                  {spec}
                  <button
                    type="button"
                    onClick={() =>
                      setSpecialties((prev) => prev.filter((s) => s !== spec))
                    }
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Type a specialty and press Enter..."
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              onKeyDown={addSpecialty}
            />
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>
              Set your monthly subscription price
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="monthlyPrice">Monthly Price ($)</Label>
              <Input
                id="monthlyPrice"
                type="number"
                step="0.01"
                min="0"
                {...register("monthlyPrice", { required: true })}
              />
              <p className="text-xs text-muted-foreground">
                This is the amount subscribers will pay per month for access to
                your Digital Twin and exclusive content.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
            <CardDescription>
              Connect your social profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="twitterUrl">Twitter / X</Label>
              <Input
                id="twitterUrl"
                placeholder="https://twitter.com/username"
                {...register("twitterUrl")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn</Label>
              <Input
                id="linkedinUrl"
                placeholder="https://linkedin.com/in/username"
                {...register("linkedinUrl")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website</Label>
              <Input
                id="websiteUrl"
                placeholder="https://yourwebsite.com"
                {...register("websiteUrl")}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Profile
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
