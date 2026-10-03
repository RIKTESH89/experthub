"use client";

import { useState } from "react";
import { Loader2, CheckCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ExpertApplicationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    specialty: "",
    reason: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.specialty || !form.reason) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expert-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to submit application");
        return;
      }

      setIsSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div role="status" className="flex flex-col items-center py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Application Submitted!</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          We&apos;ll review your application and get back to you via email. No review timeframe is guaranteed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expert-name">Full Name</Label>
          <Input
            id="expert-name"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expert-email">Gmail Address</Label>
          <Input
            id="expert-email"
            type="email"
            placeholder="you@gmail.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expert-specialty">Area of Expertise</Label>
        <Input
          id="expert-specialty"
          placeholder="e.g., Machine Learning, Finance, Health & Wellness"
          value={form.specialty}
          onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
          required
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expert-reason">Why do you want to join as an expert?</Label>
        <Textarea
          id="expert-reason"
          placeholder="Tell us about your expertise, what you'd share, and why ExpertHub is right for you..."
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          required
          disabled={isSubmitting}
          rows={3}
        />
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GraduationCap className="mr-2 h-4 w-4" />
        )}
        Submit Application
      </Button>
    </form>
  );
}
