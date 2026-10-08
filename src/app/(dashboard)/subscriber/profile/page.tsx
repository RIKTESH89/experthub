"use client";

import { SubscriberHeading } from "@/components/subscriber/page-heading";
import styles from "@/components/subscriber/subscriber-studio.module.css";

import { useState, useEffect } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PageTransition } from "@/components/ui/motion";

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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchProfile() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/users/me", { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!controller.signal.aborted) setProfile(data);
      } catch {
        if (!controller.signal.aborted) toast.error("Failed to load profile");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    fetchProfile();
    return () => controller.abort();
  }, [attempt]);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading profile" className="mx-auto max-w-2xl space-y-6 font-sans">
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
      <PageTransition className={styles.page}>
        <div role="alert" className="flex flex-col items-center justify-center py-20 font-sans">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">Failed to load profile</p>
          <button
            onClick={() => setAttempt(value => value + 1)}
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-200 cursor-pointer"
          >
            Try again
          </button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className={styles.page}>
      <SubscriberHeading section="Account / Identity" title="My profile" description="Keep your personal information and profile up to date." />
      <div className={styles.formLayout}>
        <aside><h2>Your details</h2><p className={styles.note}>Your name, photo, headline and bio help people recognize you across ExpertHub.</p><p className={styles.note}>Your email is linked to your sign-in account.</p></aside>
        <div className={styles.formSurface}><ProfileForm initialData={profile} /></div>
      </div>
    </PageTransition>
  );
}
