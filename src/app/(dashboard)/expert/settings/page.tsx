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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SettingsValues {
  emailOnNewSubscriber: boolean;
  emailOnComment: boolean;
  emailOnChat: boolean;
  emailDigest: string;
  twoFactorEnabled: boolean;
  currentPassword: string;
  newPassword: string;
}

export default function ExpertSettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const { watch, setValue, register, handleSubmit, reset } = useForm<SettingsValues>({
    defaultValues: {
      emailOnNewSubscriber: true,
      emailOnComment: true,
      emailOnChat: false,
      emailDigest: "weekly",
      twoFactorEnabled: false,
      currentPassword: "",
      newPassword: "",
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
            twoFactorEnabled: data.twoFactorEnabled ?? false,
            currentPassword: "",
            newPassword: "",
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
    try {
      const res = await fetch("/api/expert/settings", {
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your notification preferences and account settings
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${isLoading ? "hidden" : ""}`}>
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
                <Label>New Subscriber</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when someone subscribes
                </p>
              </div>
              <Switch
                checked={watch("emailOnNewSubscriber")}
                onCheckedChange={(v) => setValue("emailOnNewSubscriber", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label>New Comment</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when someone comments on your post
                </p>
              </div>
              <Switch
                checked={watch("emailOnComment")}
                onCheckedChange={(v) => setValue("emailOnComment", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label>Chat Messages</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about Digital Twin conversations
                </p>
              </div>
              <Switch
                checked={watch("emailOnChat")}
                onCheckedChange={(v) => setValue("emailOnChat", v)}
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
