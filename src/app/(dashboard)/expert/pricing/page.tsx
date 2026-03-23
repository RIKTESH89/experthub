"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, DollarSign } from "lucide-react";
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
            t.tier === "STANDARD"
              ? parseInt(values.monthlyQuestions) || 20
              : null,
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="hidden sm:block h-16 w-24 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">Pricing</h1>
            <p className="text-muted-foreground">
              Configure your subscription tiers
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  const tierOrder = ["FREE", "STANDARD", "PREMIUM"];
  const sortedTiers = [...tiers].sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-16 w-auto shrink-0">
          {/* Tier card 1 (short/free) */}
          <rect x="12" y="50" width="32" height="40" rx="4" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1.5"/>
          <line x1="18" y1="60" x2="38" y2="60" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
          <line x1="18" y1="68" x2="34" y2="68" stroke="#ede9fe" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="28" cy="80" r="4" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1"/>
          {/* Tier card 2 (medium/standard) */}
          <rect x="52" y="34" width="32" height="56" rx="4" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2"/>
          <line x1="58" y1="44" x2="78" y2="44" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
          <line x1="58" y1="52" x2="74" y2="52" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="58" y1="60" x2="76" y2="60" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="68" cy="78" r="5" fill="#ede9fe" stroke="#6366f1" strokeWidth="1.5"/>
          <path d="M66 78l2 2 4-4" stroke="#6366f1" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          {/* Tier card 3 (tall/premium) */}
          <rect x="92" y="18" width="32" height="72" rx="4" fill="#ede9fe" stroke="#6366f1" strokeWidth="2"/>
          <line x1="98" y1="28" x2="118" y2="28" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
          <line x1="98" y1="36" x2="114" y2="36" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="98" y1="44" x2="116" y2="44" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="98" y1="52" x2="112" y2="52" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="108" cy="76" r="6" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.5"/>
          {/* Dollar sign in premium */}
          <text x="104.5" y="80" fontSize="10" fill="#6366f1" fontWeight="bold">$</text>
          {/* Sparkle */}
          <path d="M130 10l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#8b5cf6" opacity="0.5"/>
        </svg>
        <div>
          <h1 className="text-2xl font-bold">Pricing</h1>
          <p className="text-muted-foreground">
            Configure your subscription tiers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sortedTiers.map((t) => {
          const values = formValues[t.tier];
          if (!values) return null;
          const isFree = t.tier === "FREE";
          const isPremium = t.tier === "PREMIUM";

          return (
            <Card key={t.tier}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {TIER_LABELS[t.tier]} Tier
                </CardTitle>
                <CardDescription>
                  {isFree
                    ? "Free access for all followers"
                    : isPremium
                    ? "Full access with unlimited features"
                    : "Mid-tier with limited twin access"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${t.tier}-price`}>
                    Price ($/month)
                  </Label>
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${t.tier}-description`}>Description</Label>
                  <Textarea
                    id={`${t.tier}-description`}
                    value={values.description}
                    onChange={(e) =>
                      handleChange(t.tier, "description", e.target.value)
                    }
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${t.tier}-questions`}>
                    Monthly Twin Questions
                  </Label>
                  {isPremium ? (
                    <Input
                      id={`${t.tier}-questions`}
                      value="Unlimited"
                      disabled
                    />
                  ) : isFree ? (
                    <Input
                      id={`${t.tier}-questions`}
                      value="0"
                      disabled
                    />
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
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${t.tier}-features`}>
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
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CardFooter className="flex justify-end px-0">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Pricing
        </Button>
      </CardFooter>
    </div>
  );
}
