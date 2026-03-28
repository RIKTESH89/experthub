"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, DollarSign, Crown, Gift, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TIER_LABELS } from "@/lib/constants";
import { PageTransition, FadeIn, motion } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

interface PricingTier {
  id: string;
  tier: "FREE" | "STANDARD" | "PREMIUM";
  price: number;
  description: string | null;
  monthlyQuestions: number | null;
  features: string[];
}

interface TierFormValues {
  price: string;
  description: string;
  monthlyQuestions: string;
  features: string;
}

const tierConfig = {
  FREE: {
    icon: Gift,
    gradient: "from-slate-500/20 via-gray-500/10 to-zinc-500/20",
    borderGradient: "from-slate-400/40 via-gray-300/60 to-zinc-400/40",
    iconBg: "bg-slate-500/10 ring-slate-500/20",
    iconColor: "text-slate-600 dark:text-slate-400",
    accentColor: "slate",
    badge: null,
    headerGradient: "from-slate-500/[0.04] to-transparent",
  },
  STANDARD: {
    icon: DollarSign,
    gradient: "from-blue-500/20 via-blue-600/10 to-blue-600/20",
    borderGradient: "from-blue-400/40 via-blue-400/60 to-blue-400/40",
    iconBg: "bg-blue-500/10 ring-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    accentColor: "blue",
    badge: null,
    headerGradient: "from-blue-500/[0.04] to-transparent",
  },
  PREMIUM: {
    icon: Crown,
    gradient: "from-blue-600/20 via-blue-500/10 to-blue-500/20",
    borderGradient: "from-blue-400/50 via-blue-400/70 to-blue-400/50",
    iconBg: "bg-blue-600/10 ring-blue-600/20",
    iconColor: "text-blue-700 dark:text-blue-400",
    accentColor: "blue",
    badge: "Popular",
    headerGradient: "from-blue-600/[0.06] to-transparent",
  },
};

function FeaturePreview({ features }: { features: string }) {
  const featureList = features
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  if (featureList.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        Preview
      </p>
      <div className="space-y-1.5">
        {featureList.map((feature, i) => (
          <motion.div
            key={`${feature}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className="flex items-start gap-2"
          >
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs text-slate-500 leading-relaxed">
              {feature}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function ExpertPricingPage() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [formValues, setFormValues] = useState<Record<string, TierFormValues>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const res = await fetch("/api/expert/pricing");
      if (!res.ok) throw new Error("Failed to fetch pricing");
      const data = await res.json();
      setTiers(data.tiers);

      const values: Record<string, TierFormValues> = {};
      for (const t of data.tiers) {
        values[t.tier] = {
          price: t.price.toString(),
          description: t.description || "",
          monthlyQuestions: t.monthlyQuestions?.toString() || "",
          features: t.features.join("\n"),
        };
      }
      setFormValues(values);
    } catch {
      toast.error("Failed to load pricing");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    tier: string,
    field: keyof TierFormValues,
    value: string
  ) => {
    setFormValues((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = tiers.map((t) => {
        const values = formValues[t.tier];
        return {
          tier: t.tier,
          price: t.tier === "FREE" ? 0 : parseFloat(values.price) || 0,
          description: values.description || null,
          monthlyQuestions:
            t.tier === "FREE"
              ? parseInt(values.monthlyQuestions) || 3
              : t.tier === "PREMIUM"
                ? null
                : parseInt(values.monthlyQuestions) || null,
          features: values.features
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
        };
      });

      const res = await fetch("/api/expert/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers: payload }),
      });

      if (!res.ok) throw new Error("Failed to save pricing");

      const data = await res.json();
      setTiers(data.tiers);
      toast.success("Pricing updated successfully!");
    } catch {
      toast.error("Failed to save pricing");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 lg:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-600/20 ring-1 ring-blue-600/20">
            <DollarSign className="h-6 w-6 text-blue-700 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pricing</h1>
            <p className="text-sm text-slate-500">
              Configure your subscription tiers
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[520px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const tierOrder = ["FREE", "PREMIUM"];
  const sortedTiers = [...tiers]
    .filter((t) => tierOrder.includes(t.tier))
    .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  return (
    <PageTransition className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <FadeIn direction="left">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-600/20 ring-1 ring-blue-600/20 shadow-lg shadow-blue-600/5">
            <DollarSign className="h-6 w-6 text-blue-700 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pricing</h1>
            <p className="text-sm text-slate-500">
              Configure your subscription tiers
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {sortedTiers.map((t, index) => {
          const values = formValues[t.tier];
          if (!values) return null;
          const isFree = t.tier === "FREE";
          const isPremium = t.tier === "PREMIUM";
          const config = tierConfig[t.tier] || tierConfig.STANDARD;
          const TierIcon = config.icon;

          return (
            <FadeIn key={t.tier} delay={index * 0.15} direction="up">
              <Card
                className={cn(
                  "relative overflow-hidden transition-all duration-200",
                  "hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20",
                  "hover:-translate-y-0.5",
                  "border-0",
                  isPremium && "ring-2 ring-blue-600/30"
                )}
              >
                {/* Gradient border effect */}
                <div className="absolute inset-0 rounded-xl p-px">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl bg-gradient-to-b opacity-60",
                      config.borderGradient
                    )}
                  />
                </div>

                {/* Inner background */}
                <div className="absolute inset-px rounded-[11px] bg-card" />

                {/* Header gradient overlay */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br pointer-events-none",
                    config.headerGradient
                  )}
                />

                {/* Popular badge for premium */}
                {config.badge && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="absolute top-4 right-4 z-10"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1E40AF] px-3 py-1 text-[11px] font-semibold text-white shadow-lg shadow-blue-700/25">
                      <Sparkles className="h-3 w-3" />
                      {config.badge}
                    </span>
                  </motion.div>
                )}

                {/* Card content */}
                <div className="relative">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl ring-1",
                          config.iconBg
                        )}
                      >
                        <TierIcon className={cn("h-5 w-5", config.iconColor)} />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">
                          {TIER_LABELS[t.tier]} Tier
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {isFree
                            ? "Free access with limited Digital Twin questions"
                            : "Full access with unlimited Digital Twin"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 pb-6">
                    {/* Price */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${t.tier}-price`}
                        className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Price (per month)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                          ₹
                        </span>
                        <Input
                          id={`${t.tier}-price`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={isFree ? "0" : values.price}
                          onChange={(e) =>
                            handleChange(t.tier, "price", e.target.value)
                          }
                          disabled={isFree}
                          className={cn(
                            "pl-7 h-11 rounded-lg border-border/60 bg-slate-50 transition-all",
                            "focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
                            isFree && "opacity-50"
                          )}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${t.tier}-description`}
                        className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Description
                      </Label>
                      <Textarea
                        id={`${t.tier}-description`}
                        value={values.description}
                        onChange={(e) =>
                          handleChange(t.tier, "description", e.target.value)
                        }
                        rows={2}
                        className={cn(
                          "rounded-lg border-border/60 bg-slate-50 resize-none transition-all",
                          "focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                        )}
                      />
                    </div>

                    {/* Monthly Questions */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${t.tier}-questions`}
                        className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Monthly Twin Questions
                      </Label>
                      {isPremium ? (
                        <div className="flex h-11 items-center rounded-lg border border-border/60 bg-gradient-to-r from-blue-600/5 to-blue-500/5 px-3">
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Unlimited
                          </span>
                        </div>
                      ) : (
                        <Input
                          id={`${t.tier}-questions`}
                          type="number"
                          min="1"
                          value={values.monthlyQuestions}
                          onChange={(e) =>
                            handleChange(
                              t.tier,
                              "monthlyQuestions",
                              e.target.value
                            )
                          }
                          placeholder="e.g. 3"
                          className={cn(
                            "h-11 rounded-lg border-border/60 bg-slate-50 transition-all",
                            "focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                          )}
                        />
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${t.tier}-features`}
                        className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Features (one per line)
                      </Label>
                      <Textarea
                        id={`${t.tier}-features`}
                        value={values.features}
                        onChange={(e) =>
                          handleChange(t.tier, "features", e.target.value)
                        }
                        rows={4}
                        placeholder="Enter each feature on a new line"
                        className={cn(
                          "rounded-lg border-border/60 bg-slate-50 resize-none transition-all",
                          "focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                        )}
                      />
                      <FeaturePreview features={values.features} />
                    </div>
                  </CardContent>
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>

      {/* Save Button */}
      <FadeIn delay={0.4} direction="up">
        <CardFooter className="flex justify-end px-0 pt-2">
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="lg"
              className={cn("cursor-pointer",
                "relative overflow-hidden rounded-xl px-8 h-12 font-semibold",
                "bg-[#1E40AF] hover:bg-[#1e3a8a]",
                "shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30",
                "text-white transition-all duration-200",
                "disabled:opacity-60 disabled:shadow-none"
              )}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-200" />
              <span className="relative flex items-center gap-2">
                {isSaving ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Save className="h-4.5 w-4.5" />
                )}
                {isSaving ? "Saving..." : "Save Pricing"}
              </span>
            </Button>
          </motion.div>
        </CardFooter>
      </FadeIn>
    </PageTransition>
  );
}
