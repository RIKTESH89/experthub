"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Loader2,
  Save,
  Bell,
  Check,
  Settings2,
  Mail,
  UserPlus,
  MessageSquare,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { PageTransition, FadeIn, motion } from "@/components/ui/motion";

interface SettingsValues {
  emailOnNewSubscriber: boolean;
  emailOnComment: boolean;
  emailOnChat: boolean;
  emailDigest: string;
}

function SectionIcon({
  icon: Icon,
  color,
}: {
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} ring-1 ring-black/5 dark:ring-white/5 shadow-sm`}
    >
      <Icon className="h-5 w-5 text-white" />
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <motion.div
      className="group flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-4 transition-all duration-200 hover:bg-muted/40 hover:border-border/70"
      whileHover={{ x: 1 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-3 pr-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary/70 group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <Label className="cursor-pointer text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
      />
    </motion.div>
  );
}

function DigestOption({
  value,
  currentValue,
  label,
  description,
  onSelect,
}: {
  value: string;
  currentValue: string;
  label: string;
  description: string;
  onSelect: (v: string) => void;
}) {
  const isSelected = value === currentValue;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(value)}
      className={`relative flex w-full flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 ${
        isSelected
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-sm"
          : "border-border/50 bg-muted/10 hover:bg-muted/30 hover:border-border/70"
      }`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className={`text-sm font-medium ${
            isSelected ? "text-primary" : "text-foreground/90"
          }`}
        >
          {label}
        </span>
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200 ${
            isSelected
              ? "border-primary bg-primary"
              : "border-muted-foreground/30"
          }`}
        >
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Check className="h-3 w-3 text-primary-foreground" />
            </motion.div>
          )}
        </div>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground/80">{description}</p>
    </motion.button>
  );
}

export default function ExpertSettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { watch, setValue, handleSubmit, reset } = useForm<SettingsValues>({
    defaultValues: {
      emailOnNewSubscriber: true,
      emailOnComment: true,
      emailOnChat: false,
      emailDigest: "weekly",
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/expert/settings");
        if (res.ok) {
          const data = await res.json();
          reset({
            emailOnNewSubscriber: data.emailOnNewSubscriber ?? true,
            emailOnComment: data.emailOnComment ?? true,
            emailOnChat: data.emailOnChat ?? false,
            emailDigest: data.emailDigest ?? "weekly",
          });
        }
      } catch {
        // Use defaults on error
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [reset]);

  const onSubmit = async (data: SettingsValues) => {
    setIsSubmitting(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/expert/settings", {
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

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <FadeIn delay={0}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
              <p className="text-sm text-muted-foreground">
                Manage your notification preferences and account settings
              </p>
            </div>
          </div>
        </FadeIn>

        {isLoading ? (
          <FadeIn>
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/5">
                <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
              </div>
              <p className="text-sm text-muted-foreground">
                Loading settings...
              </p>
            </div>
          </FadeIn>
        ) : null}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className={`space-y-6 ${isLoading ? "hidden" : ""}`}
        >
          {/* Notifications Card */}
          <FadeIn delay={0.05}>
            <Card className="group relative overflow-hidden border-border/50 bg-gradient-to-b from-card to-card/80 shadow-sm hover:shadow-md transition-all duration-200 ease-out hover:border-border/60">
              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-600/0 via-blue-600/40 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              <CardHeader className="relative pb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.02] to-transparent rounded-t-xl pointer-events-none" />
                <div className="relative flex items-center gap-3.5">
                  <SectionIcon
                    icon={Bell}
                    color="from-blue-600 to-blue-700"
                  />
                  <div>
                    <CardTitle className="text-base font-semibold tracking-tight">
                      Notifications
                    </CardTitle>
                    <CardDescription className="text-[13px] text-muted-foreground/80">
                      Choose what you want to be notified about
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <ToggleRow
                  icon={UserPlus}
                  label="New Subscriber"
                  description="Get notified when someone subscribes"
                  checked={watch("emailOnNewSubscriber")}
                  onCheckedChange={(v) => setValue("emailOnNewSubscriber", v)}
                />
                <ToggleRow
                  icon={MessageSquare}
                  label="New Comment"
                  description="Get notified when someone comments on your post"
                  checked={watch("emailOnComment")}
                  onCheckedChange={(v) => setValue("emailOnComment", v)}
                />
                <ToggleRow
                  icon={Bot}
                  label="Chat Messages"
                  description="Get notified about Digital Twin conversations"
                  checked={watch("emailOnChat")}
                  onCheckedChange={(v) => setValue("emailOnChat", v)}
                />
              </CardContent>
            </Card>
          </FadeIn>

          {/* Email Digest Card */}
          <FadeIn delay={0.1}>
            <Card className="group relative overflow-hidden border-border/50 bg-gradient-to-b from-card to-card/80 shadow-sm hover:shadow-md transition-all duration-200 ease-out hover:border-border/60">
              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-500/0 via-sky-500/40 to-sky-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              <CardHeader className="relative pb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/[0.02] to-transparent rounded-t-xl pointer-events-none" />
                <div className="relative flex items-center gap-3.5">
                  <SectionIcon
                    icon={Mail}
                    color="from-sky-500 to-blue-600"
                  />
                  <div>
                    <CardTitle className="text-base font-semibold tracking-tight">
                      Email Digest
                    </CardTitle>
                    <CardDescription className="text-[13px] text-muted-foreground/80">
                      How often would you like to receive summary emails?
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <DigestOption
                    value="daily"
                    currentValue={watch("emailDigest")}
                    label="Daily"
                    description="Every morning"
                    onSelect={(v) => setValue("emailDigest", v)}
                  />
                  <DigestOption
                    value="weekly"
                    currentValue={watch("emailDigest")}
                    label="Weekly"
                    description="Every Monday"
                    onSelect={(v) => setValue("emailDigest", v)}
                  />
                  <DigestOption
                    value="monthly"
                    currentValue={watch("emailDigest")}
                    label="Monthly"
                    description="First of each month"
                    onSelect={(v) => setValue("emailDigest", v)}
                  />
                  <DigestOption
                    value="never"
                    currentValue={watch("emailDigest")}
                    label="Never"
                    description="No digest emails"
                    onSelect={(v) => setValue("emailDigest", v)}
                  />
                </div>
              </CardContent>

              {/* Save Footer */}
              <CardFooter className="border-t border-border/40 bg-muted/10 px-6 py-4">
                <div className="flex w-full items-center justify-between">
                  <p className="text-xs text-muted-foreground/70">
                    Changes are saved when you click the button
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="relative min-w-[160px] bg-gradient-to-r from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow duration-200"
                    >
                      {isSubmitting ? (
                        <motion.span
                          className="flex items-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </motion.span>
                      ) : saveSuccess ? (
                        <motion.span
                          className="flex items-center"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Saved!
                        </motion.span>
                      ) : (
                        <motion.span
                          className="flex items-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save Settings
                        </motion.span>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </CardFooter>
            </Card>
          </FadeIn>
        </form>
      </div>
    </PageTransition>
  );
}
