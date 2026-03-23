"use client";

import { useState, useEffect } from "react";
import { Bot, CheckCircle, Circle, Database, FileText, MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TwinConfigForm } from "@/components/knowledge/twin-config-form";
import GraphStats from "@/components/knowledge/graph-stats";
import { AccuracyScore } from "@/components/knowledge/accuracy-score";
import { Skeleton } from "@/components/ui/skeleton";
import type { PersonalityProfile } from "@/lib/ai/personality-analyzer";

interface TwinData {
  twinPersonality?: string;
  twinGreeting?: string;
  ragEnabled?: boolean;
}

interface TwinStats {
  totalKnowledgeItems: number;
  indexedDocuments: number;
  totalChats: number;
}

export default function ExpertTwinPage() {
  const [twinConfig, setTwinConfig] = useState<TwinData | null>(null);
  const [stats, setStats] = useState<TwinStats | null>(null);
  const [personalityProfile, setPersonalityProfile] = useState<PersonalityProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [configRes, statsRes, personalityRes] = await Promise.all([
          fetch("/api/expert/twin-config"),
          fetch("/api/expert/twin-stats"),
          fetch("/api/expert/personality"),
        ]);

        if (configRes.ok) {
          const configData = await configRes.json();
          setTwinConfig(configData);
        } else {
          setTwinConfig({});
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else {
          setStats({ totalKnowledgeItems: 0, indexedDocuments: 0, totalChats: 0 });
        }

        if (personalityRes.ok) {
          const personalityData = await personalityRes.json();
          setPersonalityProfile(personalityData.personalityProfile ?? null);
        }
      } catch {
        setTwinConfig({});
        setStats({ totalKnowledgeItems: 0, indexedDocuments: 0, totalChats: 0 });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  const greeting = twinConfig?.twinGreeting || "Hello! How can I help you today?";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-16 w-auto shrink-0">
          {/* Human avatar */}
          <circle cx="40" cy="38" r="16" fill="#ede9fe" stroke="#6366f1" strokeWidth="2"/>
          <circle cx="40" cy="32" r="7" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5"/>
          <path d="M28 50a12 12 0 0124 0" stroke="#6366f1" strokeWidth="1.5" fill="#e0e7ff"/>
          {/* Connection lines with signal pulses */}
          <line x1="60" y1="38" x2="100" y2="38" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3"/>
          <circle cx="72" cy="38" r="3" fill="#8b5cf6" opacity="0.5"/>
          <circle cx="80" cy="38" r="2.5" fill="#6366f1" opacity="0.7"/>
          <circle cx="88" cy="38" r="3" fill="#8b5cf6" opacity="0.5"/>
          {/* AI avatar */}
          <circle cx="120" cy="38" r="16" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2"/>
          <rect x="112" y="30" width="16" height="16" rx="3" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.5"/>
          <circle cx="117" cy="37" r="1.5" fill="#6366f1"/>
          <circle cx="123" cy="37" r="1.5" fill="#6366f1"/>
          <path d="M115 42c0 0 2.5 3 5 3s5-3 5-3" stroke="#6366f1" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          {/* Signal waves from AI */}
          <path d="M140 30c4 4 4 12 0 16" stroke="#8b5cf6" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
          <path d="M146 26c6 6 6 20 0 26" stroke="#8b5cf6" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.3"/>
          {/* Sparkle */}
          <path d="M80 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#6366f1" opacity="0.6"/>
        </svg>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Digital Twin Configuration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your AI-powered Twin
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalKnowledgeItems}</p>
                <p className="text-xs text-muted-foreground">
                  Knowledge Items
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <FileText className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.indexedDocuments}</p>
                <p className="text-xs text-muted-foreground">
                  Indexed Documents
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalChats}</p>
                <p className="text-xs text-muted-foreground">
                  Total Chats
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: personalityProfile ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)" }}>
                {personalityProfile ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {personalityProfile ? "Analyzed" : "Not analyzed"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Personality
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accuracy Score & Knowledge Graph */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccuracyScore />
        <GraphStats />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Config Form */}
        <div className="lg:col-span-3">
          <TwinConfigForm
            initialData={twinConfig ?? undefined}
            personalityProfile={personalityProfile}
          />
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chat Preview</CardTitle>
              <CardDescription>
                This is how your Digital Twin will appear to subscribers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                {/* Chat Header Preview */}
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Your AI Twin</p>
                    <p className="text-xs text-muted-foreground">
                      AI Digital Twin
                    </p>
                  </div>
                  <div className="ml-auto h-2 w-2 rounded-full bg-green-500" />
                </div>

                {/* Greeting Message Preview */}
                <div className="mt-4 flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg rounded-tl-none bg-card border border-border p-3">
                    <p className="text-sm">{greeting}</p>
                  </div>
                </div>

                {/* Simulated User Message */}
                <div className="mt-4 flex justify-end gap-3">
                  <div className="rounded-lg rounded-tr-none bg-primary/10 p-3">
                    <p className="text-sm">
                      What can you help me with?
                    </p>
                  </div>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">U</AvatarFallback>
                  </Avatar>
                </div>

                {/* Simulated Response */}
                <div className="mt-4 flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg rounded-tl-none bg-card border border-border p-3">
                    <p className="text-sm text-muted-foreground">
                      I can answer questions based on my expert&apos;s knowledge
                      base, covering their areas of expertise and published
                      content...
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
