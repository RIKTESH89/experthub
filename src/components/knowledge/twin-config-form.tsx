"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Bot, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import type { PersonalityProfile } from "@/lib/ai/personality-analyzer";

interface TwinConfigValues {
  twinPersonality: string;
  twinGreeting: string;
  ragEnabled: boolean;
}

interface TwinConfigFormProps {
  initialData?: {
    twinPersonality?: string;
    twinGreeting?: string;
    ragEnabled?: boolean;
  };
  personalityProfile?: PersonalityProfile | null;
  onSuccess?: () => void;
}

export function TwinConfigForm({ initialData, personalityProfile, onSuccess }: TwinConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<PersonalityProfile | null>(
    personalityProfile ?? null
  );

  const { register, handleSubmit, watch, setValue } = useForm<TwinConfigValues>({
    defaultValues: {
      twinPersonality: initialData?.twinPersonality ?? "",
      twinGreeting:
        initialData?.twinGreeting ?? "Hello! How can I help you today?",
      ragEnabled: initialData?.ragEnabled ?? true,
    },
  });

  const ragEnabled = watch("ragEnabled");

  const onSubmit = async (data: TwinConfigValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expert/twin-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save configuration");

      toast.success("Digital Twin configuration saved");
      onSuccess?.();
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyzePersonality = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/expert/personality", {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error || "Failed to analyze personality");
        return;
      }

      const data = await res.json();
      setCurrentProfile(data.personalityProfile);
      toast.success("Personality analysis complete");
    } catch {
      toast.error("Failed to analyze personality");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Digital Twin Configuration</CardTitle>
            <CardDescription>
              Customize how your AI twin interacts with subscribers
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* Personality Analysis Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Personality Replication</Label>
                <p className="text-xs text-muted-foreground">
                  Analyze your writing style to help your AI twin replicate your personality
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAnalyzePersonality}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Analyze My Style
              </Button>
            </div>

            {currentProfile && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Tone:</span>
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                    {currentProfile.tone}
                  </Badge>
                </div>

                {currentProfile.catchphrases.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium text-muted-foreground">Catchphrases:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentProfile.catchphrases.map((phrase, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {phrase}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Writing Style:</span>
                  <p className="text-sm text-foreground/80">{currentProfile.writingStyle}</p>
                </div>

                {currentProfile.communicationGuidelines.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium text-muted-foreground">Communication Guidelines:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {currentProfile.communicationGuidelines.map((guideline, i) => (
                        <li key={i} className="text-sm text-foreground/80">{guideline}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentProfile.topicExpertise.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium text-muted-foreground">Topic Expertise:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentProfile.topicExpertise.map((topic, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">Sentence Patterns:</span>
                  <p className="text-sm text-foreground/80">{currentProfile.sentencePatterns}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="twinPersonality">
              Personality / System Prompt
            </Label>
            <Textarea
              id="twinPersonality"
              placeholder="Describe how your AI twin should behave, its tone of voice, areas of expertise, and any specific instructions..."
              className="min-h-[160px] resize-y"
              {...register("twinPersonality")}
            />
            <p className="text-xs text-muted-foreground">
              This defines the personality and behavior of your AI twin when
              responding to subscribers.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twinGreeting">Greeting Message</Label>
            <Input
              id="twinGreeting"
              placeholder="Hello! How can I help you today?"
              {...register("twinGreeting")}
            />
            <p className="text-xs text-muted-foreground">
              The first message subscribers see when they start a chat.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="ragEnabled" className="cursor-pointer">
                RAG-Enabled Responses
              </Label>
              <p className="text-xs text-muted-foreground">
                When enabled, your AI twin will use your knowledge base to
                provide more accurate, personalized responses.
              </p>
            </div>
            <Switch
              id="ragEnabled"
              checked={ragEnabled}
              onCheckedChange={(checked) => setValue("ragEnabled", checked)}
            />
          </div>
        </CardContent>

        <CardFooter className="border-t pt-4">
          <Button type="submit" disabled={isSubmitting} className="ml-auto">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
