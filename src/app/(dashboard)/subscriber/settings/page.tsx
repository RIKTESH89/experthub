"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save, Bell, Mail, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PageTransition, FadeIn } from "@/components/ui/motion";

interface SettingsValues {
  emailOnNewPost: boolean;
  emailOnReply: boolean;
  emailDigest: string;
}

export default function SubscriberSettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { watch, setValue, handleSubmit, reset } = useForm<SettingsValues>({
    defaultValues: {
      emailOnNewPost: true,
      emailOnReply: true,
      emailDigest: "weekly",
    },
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/subscriber/settings");
        if (!res.ok) return;
        const data = await res.json();
        reset({
          emailOnNewPost: data.emailOnNewPost ?? true,
          emailOnReply: data.emailOnReply ?? true,
          emailDigest: data.emailDigest ?? "weekly",
        });
      } catch {
        // Use defaults on failure
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [reset]);

  const onSubmit = async (data: SettingsValues) => {
    setIsSubmitting(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/subscriber/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved successfully");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const digestOptions = [
    { value: "daily", label: "Daily", description: "Every morning" },
    { value: "weekly", label: "Weekly", description: "Every Monday" },
    { value: "monthly", label: "Monthly", description: "First of month" },
    { value: "never", label: "Never", description: "No digests" },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 font-sans">
        {/* Header skeleton */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        {/* Notifications skeleton */}
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="flex justify-end pt-2">
            <Skeleton className="h-11 w-36 rounded-xl" />
          </div>
        </div>
      </div>
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
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-sans">
                  Settings
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Manage your notification preferences and account settings
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Settings form */}
        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Notifications card */}
            <div className="overflow-hidden rounded-2xl border bg-card">
              {/* Card header */}
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                    <Bell className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground font-sans">Notifications</h3>
                    <p className="text-sm text-slate-500">
                      Choose what you want to be notified about
                    </p>
                  </div>
                </div>
              </div>

              {/* Card content */}
              <div className="space-y-3 p-6">
                {/* New Posts toggle */}
                <div className="group flex items-center justify-between rounded-xl border border-border/60 p-4 transition-all duration-200 hover:border-[#1E40AF]/20 hover:bg-[#1E40AF]/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium cursor-pointer">
                        New Posts from Experts
                      </Label>
                      <p className="text-xs text-slate-500">
                        Get notified when subscribed experts publish new content
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={watch("emailOnNewPost")}
                    onCheckedChange={(v) => setValue("emailOnNewPost", v)}
                    className="cursor-pointer"
                  />
                </div>

                {/* Replies toggle */}
                <div className="group flex items-center justify-between rounded-xl border border-border/60 p-4 transition-all duration-200 hover:border-[#1E40AF]/20 hover:bg-[#1E40AF]/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium cursor-pointer">
                        Replies to Comments
                      </Label>
                      <p className="text-xs text-slate-500">
                        Get notified when someone replies to your comments
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={watch("emailOnReply")}
                    onCheckedChange={(v) => setValue("emailOnReply", v)}
                    className="cursor-pointer"
                  />
                </div>

                {/* Email Digest selector */}
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E40AF]/10 text-[#1E40AF]">
                      <Clock className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Email Digest</Label>
                      <p className="text-xs text-slate-500">
                        How often to receive a summary of activity
                      </p>
                    </div>
                  </div>
                  <Select
                    value={watch("emailDigest")}
                    onValueChange={(v) => setValue("emailDigest", v)}
                  >
                    <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-slate-50 transition-colors duration-200 focus:bg-background cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {digestOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="rounded-md cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-xs text-slate-500">
                              {opt.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Card footer */}
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                <p className="text-xs text-slate-500">
                  Changes are saved to your account
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`relative h-11 min-w-[140px] rounded-xl font-medium transition-all duration-200 cursor-pointer ${
                    saveSuccess
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
