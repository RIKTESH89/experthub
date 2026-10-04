"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Loader2,
  Save,
  Globe,
  Shield,
  CreditCard,
  Bell,
  Check,
  Settings2,
} from "lucide-react";
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
import { PageTransition, FadeIn } from "@/components/ui/motion";

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

function SectionIcon({
  icon: Icon,
  color,
}: {
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} ring-1 ring-black/5 dark:ring-white/5 shadow-sm`}
    >
      <Icon className="h-5 w-5 text-white" />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="group flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-4 transition-all duration-200 hover:bg-muted/40 hover:border-border/70">
      <div className="space-y-0.5 pr-4">
        <Label className="cursor-pointer text-sm font-medium font-sans">{label}</Label>
        <p className="text-xs text-muted-foreground leading-relaxed font-sans">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0 cursor-pointer"
      />
    </div>
  );
}

function SettingsCard({
  icon,
  iconColor,
  title,
  description,
  children,
  delay = 0,
  footer,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
  footer?: React.ReactNode;
}) {
  return (
    <FadeIn delay={delay}>
      <Card className="group relative overflow-hidden border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:border-border/60">
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <CardHeader className="relative pb-4">
          <div className="relative flex items-center gap-3.5">
            <SectionIcon icon={icon} color={iconColor} />
            <div>
              <CardTitle className="text-base font-semibold tracking-tight font-sans">
                {title}
              </CardTitle>
              <CardDescription className="text-[13px] text-muted-foreground font-sans">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">{children}</CardContent>

        {footer && (
          <CardFooter className="border-t border-border/40 bg-muted/10 px-6 py-4">
            {footer}
          </CardFooter>
        )}
      </Card>
    </FadeIn>
  );
}

function PremiumInput({
  id,
  label,
  type = "text",
  register,
  ...props
}: {
  id: string;
  label: string;
  type?: string;
  register: ReturnType<typeof useForm<PlatformSettings>>["register"];
  [key: string]: unknown;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-sm font-medium text-foreground font-sans"
      >
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        className="border-border/50 bg-card focus:bg-background transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        {...register(id as keyof PlatformSettings)}
        {...props}
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { register, handleSubmit, watch, setValue, reset } =
    useForm<PlatformSettings>({
      defaultValues: {
        siteName: "ExpertHub",
        siteDescription: "",
        supportEmail: "",
        defaultExpertRate: "0",
        platformFeePercent: "15",
        maintenanceMode: false,
        registrationEnabled: true,
        expertAutoApproval: false,
        emailNotifications: true,
        contentModeration: "moderate",
      },
    });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) return;
        const data = await res.json();
        reset(data);
      } catch {
        // Use defaults
      }
    }
    loadSettings();
  }, [reset]);

  const maintenanceMode = watch("maintenanceMode");
  const registrationEnabled = watch("registrationEnabled");
  const expertAutoApproval = watch("expertAutoApproval");
  const emailNotifications = watch("emailNotifications");

  const onSubmit = async (data: PlatformSettings) => {
    setIsSubmitting(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Platform settings saved successfully");
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
      <div className="space-y-8 font-sans">
        {/* Header */}
        <FadeIn delay={0}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-medium tracking-tight font-sans">
                Platform Settings
              </h2>
              <p className="text-sm text-muted-foreground font-sans">
                Configure global platform settings and preferences.
              </p>
            </div>
          </div>
        </FadeIn>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* General */}
          <SettingsCard
            icon={Globe}
            iconColor="bg-primary"
            title="General Settings"
            description="Basic platform configuration"
            delay={0.05}
          >
            <PremiumInput id="siteName" label="Site Name" register={register} />
            <div className="space-y-2">
              <Label
                htmlFor="siteDescription"
                className="text-sm font-medium text-foreground font-sans"
              >
                Site Description
              </Label>
              <Textarea
                id="siteDescription"
                className="resize-none border-border/50 bg-card focus:bg-background transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 min-h-[80px]"
                {...register("siteDescription")}
              />
            </div>
            <PremiumInput
              id="supportEmail"
              label="Support Email"
              type="email"
              register={register}
            />
          </SettingsCard>

          {/* Monetization */}
          <SettingsCard
            icon={CreditCard}
            iconColor="bg-emerald-600"
            title="Monetization"
            description="Pricing and fee configuration"
            delay={0.1}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="defaultExpertRate"
                  className="text-sm font-medium text-foreground font-sans"
                >
                  Default Expert Rate (per month)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    ₹
                  </span>
                  <Input
                    id="defaultExpertRate"
                    type="number"
                    step="0.01"
                    className="pl-7 border-border/50 bg-card focus:bg-background transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                    {...register("defaultExpertRate")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="platformFeePercent"
                  className="text-sm font-medium text-foreground font-sans"
                >
                  Platform Fee
                </Label>
                <div className="relative">
                  <Input
                    id="platformFeePercent"
                    type="number"
                    className="pr-8 border-border/50 bg-card focus:bg-background transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                    {...register("platformFeePercent")}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    %
                  </span>
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* Security */}
          <SettingsCard
            icon={Shield}
            iconColor="bg-primary"
            title="Security & Access"
            description="Control platform access and moderation"
            delay={0.15}
          >
            <div className="space-y-3">
              <ToggleRow
                label="Maintenance Mode"
                description="Temporarily disable the platform for maintenance"
                checked={maintenanceMode}
                onCheckedChange={(v) => setValue("maintenanceMode", v)}
              />
              <ToggleRow
                label="Registration Enabled"
                description="Allow new users to register"
                checked={registrationEnabled}
                onCheckedChange={(v) => setValue("registrationEnabled", v)}
              />
              <ToggleRow
                label="Expert Auto-Approval"
                description="Automatically verify new expert accounts"
                checked={expertAutoApproval}
                onCheckedChange={(v) => setValue("expertAutoApproval", v)}
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-sm font-medium text-foreground font-sans">
                Content Moderation Level
              </Label>
              <Select
                value={watch("contentModeration")}
                onValueChange={(v) => setValue("contentModeration", v)}
              >
                <SelectTrigger className="cursor-pointer border-border/50 bg-card focus:bg-background transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off" className="cursor-pointer">Off</SelectItem>
                  <SelectItem value="light" className="cursor-pointer">Light</SelectItem>
                  <SelectItem value="moderate" className="cursor-pointer">Moderate</SelectItem>
                  <SelectItem value="strict" className="cursor-pointer">Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SettingsCard>

          {/* Notifications */}
          <SettingsCard
            icon={Bell}
            iconColor="bg-primary"
            title="Notifications"
            description="Email and notification settings"
            delay={0.2}
            footer={
              <div className="flex w-full justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer relative min-w-[160px] bg-primary hover:bg-primary/90 shadow-[0_2px_8px_rgba(30,64,175,0.2)] hover:shadow-[0_4px_12px_rgba(30,64,175,0.3)] transition-all duration-200"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : saveSuccess ? (
                    <span className="flex items-center">
                      <Check className="mr-2 h-4 w-4" />
                      Saved!
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </span>
                  )}
                </Button>
              </div>
            }
          >
            <ToggleRow
              label="Email Notifications"
              description="Send email notifications for important events"
              checked={emailNotifications}
              onCheckedChange={(v) => setValue("emailNotifications", v)}
            />
          </SettingsCard>
        </form>
      </div>
    </PageTransition>
  );
}
