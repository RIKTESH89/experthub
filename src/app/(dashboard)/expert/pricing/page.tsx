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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 110 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-16 w-auto shrink-0">
          {/* Tier card 1 (free) */}
          <rect x="10" y="40" width="36" height="50" rx="4" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1.5"/>
          <line x1="17" y1="52" x2="39" y2="52" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"/>
          <line x1="17" y1="60" x2="35" y2="60" stroke="#ede9fe" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="28" cy="78" r="4" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1"/>
          {/* Tier card 2 (premium) */}
          <rect x="56" y="18" width="36" height="72" rx="4" fill="#ede9fe" stroke="#6366f1" strokeWidth="2"/>
          <line x1="63" y1="30" x2="85" y2="30" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
          <line x1="63" y1="38" x2="81" y2="38" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="63" y1="46" x2="83" y2="46" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="63" y1="54" x2="79" y2="54" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="74" cy="76" r="6" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.5"/>
          <text x="70.5" y="80" fontSize="10" fill="#6366f1" fontWeight="bold">$</text>
          {/* Sparkle */}
          <path d="M98 10l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#8b5cf6" opacity="0.5"/>
        </svg>
        <div>
          <h1 className="text-2xl font-bold">Pricing</h1>
          <p className="text-muted-foreground">
            Configure your subscription tiers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                    ? "Free access with limited Digital Twin questions"
                    : "Full access with unlimited Digital Twin"}
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
