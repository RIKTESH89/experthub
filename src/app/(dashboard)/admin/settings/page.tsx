"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save, Globe, Shield, CreditCard, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

interface PlatformSettings {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  defaultExpertRate: string;
  platformFeePercent: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  expertAutoApproval: boolean;
  emailNotifications: boolean;
  contentModeration: string;
}

export default function AdminSettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue } =
    useForm<PlatformSettings>({
      defaultValues: {
        siteName: "ExpertHub",
        siteDescription:
          "Connect with expert minds through AI-powered digital twins",
        supportEmail: "support@experthub.com",
        defaultExpertRate: "9.99",
        platformFeePercent: "15",
        maintenanceMode: false,
        registrationEnabled: true,
        expertAutoApproval: false,
        emailNotifications: true,
        contentModeration: "moderate",
      },
    });

  const maintenanceMode = watch("maintenanceMode");
  const registrationEnabled = watch("registrationEnabled");
  const expertAutoApproval = watch("expertAutoApproval");
  const emailNotifications = watch("emailNotifications");

  const onSubmit = async (data: PlatformSettings) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Platform settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Platform Settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure global platform settings and preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* General */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Basic platform configuration
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input id="siteName" {...register("siteName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                className="resize-none"
                {...register("siteDescription")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                {...register("supportEmail")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Monetization */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Monetization</CardTitle>
                <CardDescription>
                  Pricing and fee configuration
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultExpertRate">
                  Default Expert Rate ($/month)
                </Label>
                <Input
                  id="defaultExpertRate"
                  type="number"
                  step="0.01"
                  {...register("defaultExpertRate")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platformFeePercent">
                  Platform Fee (%)
                </Label>
                <Input
                  id="platformFeePercent"
                  type="number"
                  {...register("platformFeePercent")}
                />
              </div>
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
                <CardTitle>Security &amp; Access</CardTitle>
                <CardDescription>
                  Control platform access and moderation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="cursor-pointer">Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Temporarily disable the platform for maintenance
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={(v) => setValue("maintenanceMode", v)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="cursor-pointer">Registration Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Allow new users to register
                </p>
              </div>
              <Switch
                checked={registrationEnabled}
                onCheckedChange={(v) => setValue("registrationEnabled", v)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="cursor-pointer">Expert Auto-Approval</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically verify new expert accounts
                </p>
              </div>
              <Switch
                checked={expertAutoApproval}
                onCheckedChange={(v) => setValue("expertAutoApproval", v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Content Moderation Level</Label>
              <Select
                value={watch("contentModeration")}
                onValueChange={(v) => setValue("contentModeration", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Email and notification settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="cursor-pointer">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Send email notifications for important events
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(v) => setValue("emailNotifications", v)}
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
