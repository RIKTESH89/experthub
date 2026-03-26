"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SettingsValues {
  emailOnNewPost: boolean;
  emailOnReply: boolean;
  emailDigest: string;
  twoFactorEnabled: boolean;
  currentPassword: string;
  newPassword: string;
}

export default function SubscriberSettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { watch, setValue, register, handleSubmit, reset } = useForm<SettingsValues>({
    defaultValues: {
      emailOnNewPost: true,
      emailOnReply: true,
      emailDigest: "weekly",
      twoFactorEnabled: false,
      currentPassword: "",
      newPassword: "",
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
          twoFactorEnabled: data.twoFactorEnabled ?? false,
          currentPassword: "",
          newPassword: "",
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
    try {
      const res = await fetch("/api/subscriber/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your notification preferences and account security
          </p>
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your notification preferences and account security
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Choose what you want to be notified about
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label>New Posts from Experts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when subscribed experts publish new content
                </p>
              </div>
              <Switch
                checked={watch("emailOnNewPost")}
                onCheckedChange={(v) => setValue("emailOnNewPost", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label>Replies to Comments</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when someone replies to your comments
                </p>
              </div>
              <Switch
                checked={watch("emailOnReply")}
                onCheckedChange={(v) => setValue("emailOnReply", v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Digest</Label>
              <Select
                value={watch("emailDigest")}
                onValueChange={(v) => setValue("emailDigest", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage your account security
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch
                checked={watch("twoFactorEnabled")}
                onCheckedChange={(v) => setValue("twoFactorEnabled", v)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter current password"
                {...register("currentPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                {...register("newPassword")}
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
              Save Settings
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
