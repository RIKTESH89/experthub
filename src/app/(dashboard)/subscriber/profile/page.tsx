"use client";

import { useState, useEffect } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-indigo-900">My Profile</h2>
          <p className="mt-1 text-sm text-indigo-600/70">
            Your personal info
          </p>
        </div>
        <svg className="hidden sm:block" width="140" height="100" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Profile card */}
          <rect x="15" y="10" width="80" height="80" rx="10" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
          {/* Avatar circle */}
          <circle cx="55" cy="38" r="16" fill="#ddd6fe" stroke="#6366f1" strokeWidth="1.5" />
          {/* User silhouette */}
          <circle cx="55" cy="33" r="6" fill="#8b5cf6" opacity="0.6" />
          <path d="M43 50C43 43 48 39 55 39C62 39 67 43 67 50" fill="#8b5cf6" opacity="0.4" />
          {/* Name line */}
          <rect x="35" y="62" width="40" height="4" rx="2" fill="#ddd6fe" />
          <rect x="40" y="72" width="30" height="3" rx="1.5" fill="#e0e7ff" />
          {/* Edit pencil */}
          <rect x="105" y="20" width="22" height="22" rx="6" fill="#6366f1" opacity="0.15" />
          <path d="M112 36L112 28L120 28" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M114 26L124 36" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          <path d="M122 28L126 32" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          {/* Decorative dots */}
          <circle cx="110" cy="60" r="3" fill="#8b5cf6" opacity="0.2" />
          <circle cx="120" cy="68" r="2" fill="#6366f1" opacity="0.15" />
          <circle cx="128" cy="55" r="2.5" fill="#8b5cf6" opacity="0.25" />
        </svg>
      </div>

      <ProfileForm initialData={profile} />
    </div>
  );
}
