"use client";

import { useState, useEffect } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PageTransition, FadeIn } from "@/components/ui/motion";

interface ProfileData {
  name: string;
  email: string;
  bio?: string | null;
  headline?: string | null;
  image?: string | null;
}

export default function SubscriberProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProfile(data);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 font-sans">
        {/* Header skeleton */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </div>
        {/* Form skeleton */}
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="flex justify-end pt-2">
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-20 font-sans">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">Failed to load profile</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm font-medium text-[#1E40AF] hover:text-[#1E40AF]/80 transition-colors duration-200 cursor-pointer"
          >
            Try again
          </button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-6 font-sans">
        {/* Header */}
        <FadeIn delay={0}>
          <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-6">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-[#1E40AF]" />

            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1E40AF] text-white">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-sans">
                  My Profile
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Manage your personal information and public presence
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Form card */}
        <FadeIn delay={0.1}>
          <div className="rounded-2xl border bg-card p-5">
            <ProfileForm initialData={profile} />
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
