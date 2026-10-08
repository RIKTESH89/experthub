"use client";

import { SubscriberHeading } from "@/components/subscriber/page-heading";
import styles from "@/components/subscriber/subscriber-studio.module.css";

import { useState, useEffect, useRef } from "react";
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
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saveRequest = useRef<AbortController | null>(null);
  useEffect(() => () => saveRequest.current?.abort(), []);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { watch, setValue, handleSubmit, reset, formState: { isDirty } } = useForm<SettingsValues>({
    defaultValues: {
      emailOnNewPost: true,
      emailOnReply: true,
      emailDigest: "weekly",
    },
  });

  useEffect(() => {
    const request = new AbortController();
    setIsLoading(true);
    setLoadError(false);
    async function fetchSettings() {
      try {
        const res = await fetch("/api/subscriber/settings", { signal: request.signal });
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        if (request.signal.aborted) return;
        reset({
          emailOnNewPost: data.emailOnNewPost ?? true,
          emailOnReply: data.emailOnReply ?? true,
          emailDigest: data.emailDigest ?? "weekly",
        });
      } catch {
        if (!request.signal.aborted) setLoadError(true);
      } finally {
        if (!request.signal.aborted) setIsLoading(false);
      }
    }
    fetchSettings();
    return () => request.abort();
  }, [reset, loadAttempt]);

  const onSubmit = async (data: SettingsValues) => {
    if (submittingRef.current || loadError) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSaveSuccess(false);
    setSaveError(null);
    const request = new AbortController();
    saveRequest.current = request;
    try {
      const res = await fetch("/api/subscriber/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: request.signal,
      });
      if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Your session cannot save these preferences. Your choices are kept here." : "Preferences could not be saved. Your choices are kept here; try again.");
      if (request.signal.aborted) return;
      reset(data);
      toast.success("Settings saved successfully");
      setSaveSuccess(true);

    } catch (error) {
      if (!request.signal.aborted) setSaveError(error instanceof Error && error.name !== "TypeError" ? error.message : "Save response could not be confirmed. Review your saved preferences before retrying an interrupted request.");
    } finally {
      submittingRef.current = false;
      if (!request.signal.aborted) setIsSubmitting(false);
    }
  };

  const digestOptions = [
    { value: "daily", label: "Daily", description: "Daily summary" },
    { value: "weekly", label: "Weekly", description: "Weekly summary" },
    { value: "monthly", label: "Monthly", description: "Monthly summary" },
    { value: "never", label: "Never", description: "No digests" },
  ];

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading preferences" className="mx-auto max-w-2xl space-y-6 font-sans">
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
          <div className="flex min-w-0 items-center gap-3">
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
    <PageTransition className={styles.page}>
      <div className="mx-auto max-w-2xl space-y-6 font-sans">
        <SubscriberHeading section="Account / Preferences" title="Settings" description="Choose which updates reach your inbox, and how often." />
        {loadError && <div className={styles.notice} role="alert"><strong>Preferences could not be loaded</strong><p>Try again to review your saved settings before making changes.</p><Button variant="outline" onClick={() => setLoadAttempt(value => value + 1)}>Try again</Button></div>}
        {saveError && <p role="alert" className="text-destructive">{saveError}</p>}
        {/* Settings form */}
        <FadeIn delay={0.1}>
          {isSubmitting ? <p role="status">Saving preferences…</p> : saveSuccess && !isDirty ? <p role="status">Preferences saved.</p> : null}
          <form aria-busy={isSubmitting} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Notifications card */}
            <div className="overflow-hidden rounded-2xl border bg-card">
              {/* Card header */}
              <div className="border-b border-border bg-secondary px-6 py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground font-sans">Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose what you want to be notified about
                    </p>
                  </div>
                </div>
              </div>

              {/* Card content */}
              <div className="space-y-3 p-6">
                {/* New Posts toggle */}
                <div className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-primary/5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="emailOnNewPost" className="text-sm font-medium cursor-pointer">
                        New Posts from Experts
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when subscribed experts publish new content
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="emailOnNewPost"
                    disabled={isSubmitting || loadError}
                    checked={watch("emailOnNewPost")}
                    onCheckedChange={(v) => setValue("emailOnNewPost", v, { shouldDirty: true })}
                    className="shrink-0 cursor-pointer"
                  />
                </div>

                {/* Replies toggle */}
                <div className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-primary/5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="emailOnReply" className="text-sm font-medium cursor-pointer">
                        Replies to Comments
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when someone replies to your comments
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="emailOnReply"
                    disabled={isSubmitting || loadError}
                    checked={watch("emailOnReply")}
                    onCheckedChange={(v) => setValue("emailOnReply", v, { shouldDirty: true })}
                    className="shrink-0 cursor-pointer"
                  />
                </div>

                {/* Email Digest selector */}
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="h-4.5 w-4.5" />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="emailDigest" className="text-sm font-medium">Email Digest</Label>
                      <p className="text-xs text-muted-foreground">
                        How often to receive a summary of activity
                      </p>
                    </div>
                  </div>
                  <Select
                    disabled={isSubmitting || loadError}
                    value={watch("emailDigest")}
                    onValueChange={(v) => setValue("emailDigest", v, { shouldDirty: true })}
                  >
                    <SelectTrigger id="emailDigest" className="h-11 rounded-lg border-border bg-secondary transition-colors duration-200 focus:bg-background cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {digestOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="rounded-md cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-xs text-muted-foreground">
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary px-6 py-4">
                <p className="text-xs text-muted-foreground">
                  Save to apply these preferences
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting || loadError || !isDirty}
                  className="relative h-11 min-w-[140px] rounded-lg font-medium transition-colors duration-200 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : saveSuccess && !isDirty ? (
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
