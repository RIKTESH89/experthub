"use client";

import { useState, useEffect } from "react";
import { Bot, CheckCircle, Circle, Database, FileText, MessageSquare, Sparkles, Zap } from "lucide-react";
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
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
  AnimatedCounter,
  motion,
} from "@/components/ui/motion";
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

function PremiumStatCard({
  icon: Icon,
  value,
  label,
  gradient,
  iconColor,
  delay = 0,
  isText = false,
  textValue,
}: {
  icon: React.ElementType;
  value?: number;
  label: string;
  gradient: string;
  iconColor: string;
  delay?: number;
  isText?: boolean;
  textValue?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] }}
    >
      <Card className="group relative overflow-hidden border-border/50 hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-200 hover:-translate-y-0.5">
        {/* Gradient accent top bar */}
        <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-200`} />
        {/* Hover glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-200 pointer-events-none`} />
        <CardContent className="relative flex items-center gap-3.5 p-4">
          <motion.div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconColor} ring-1 ring-inset ring-white/10 shadow-sm`}
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Icon className="h-5 w-5 text-white" />
          </motion.div>
          <div className="min-w-0">
            {isText ? (
              <motion.p
                className="text-sm font-bold tracking-tight text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.3 }}
              >
                {textValue}
              </motion.p>
            ) : (
              <AnimatedCounter
                value={value ?? 0}
                duration={1.4}
                className="text-2xl font-bold tracking-tight text-foreground"
              />
            )}
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
              {label}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
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
    <PageTransition className="space-y-6">
      {/* Header */}
      <FadeIn direction="up" duration={0.5}>
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block h-16 w-auto shrink-0">
            {/* Human avatar */}
            <circle cx="40" cy="38" r="16" fill="#dbeafe" stroke="#1E40AF" strokeWidth="2"/>
            <circle cx="40" cy="32" r="7" fill="#bfdbfe" stroke="#1E40AF" strokeWidth="1.5"/>
            <path d="M28 50a12 12 0 0124 0" stroke="#1E40AF" strokeWidth="1.5" fill="#bfdbfe"/>
            {/* Connection lines with signal pulses */}
            <line x1="60" y1="38" x2="100" y2="38" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4 3"/>
            <circle cx="72" cy="38" r="3" fill="#2563eb" opacity="0.5"/>
            <circle cx="80" cy="38" r="2.5" fill="#1E40AF" opacity="0.7"/>
            <circle cx="88" cy="38" r="3" fill="#2563eb" opacity="0.5"/>
            {/* AI avatar */}
            <circle cx="120" cy="38" r="16" fill="#dbeafe" stroke="#2563eb" strokeWidth="2"/>
            <rect x="112" y="30" width="16" height="16" rx="3" fill="#93c5fd" stroke="#2563eb" strokeWidth="1.5"/>
            <circle cx="117" cy="37" r="1.5" fill="#1E40AF"/>
            <circle cx="123" cy="37" r="1.5" fill="#1E40AF"/>
            <path d="M115 42c0 0 2.5 3 5 3s5-3 5-3" stroke="#1E40AF" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            {/* Signal waves from AI */}
            <path d="M140 30c4 4 4 12 0 16" stroke="#2563eb" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
            <path d="M146 26c6 6 6 20 0 26" stroke="#2563eb" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.3"/>
            {/* Sparkle */}
            <path d="M80 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#1E40AF" opacity="0.6"/>
          </svg>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Digital Twin Configuration
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure your AI-powered Twin
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Premium Stats */}
      {stats && (
        <StaggerContainer className="grid gap-4 sm:grid-cols-4">
          <StaggerItem>
            <PremiumStatCard
              icon={Database}
              value={stats.totalKnowledgeItems}
              label="Knowledge Items"
              gradient="from-blue-700 to-blue-600"
              iconColor="bg-gradient-to-br from-blue-700 to-blue-600"
              delay={0}
            />
          </StaggerItem>
          <StaggerItem>
            <PremiumStatCard
              icon={FileText}
              value={stats.indexedDocuments}
              label="Indexed Documents"
              gradient="from-emerald-500 to-teal-600"
              iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
              delay={0.08}
            />
          </StaggerItem>
          <StaggerItem>
            <PremiumStatCard
              icon={MessageSquare}
              value={stats.totalChats}
              label="Total Chats"
              gradient="from-blue-500 to-cyan-600"
              iconColor="bg-gradient-to-br from-blue-500 to-cyan-600"
              delay={0.16}
            />
          </StaggerItem>
          <StaggerItem>
            <PremiumStatCard
              icon={personalityProfile ? CheckCircle : Circle}
              label="Personality"
              gradient={personalityProfile ? "from-emerald-500 to-green-600" : "from-gray-400 to-gray-500"}
              iconColor={personalityProfile ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-gray-400 to-gray-500"}
              delay={0.24}
              isText
              textValue={personalityProfile ? "Analyzed" : "Not analyzed"}
            />
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Accuracy Score & Knowledge Graph */}
      <FadeIn direction="up" delay={0.2}>
        <div className="grid gap-6 lg:grid-cols-2">
          <AccuracyScore />
          <GraphStats />
        </div>
      </FadeIn>

      {/* Config + Preview */}
      <FadeIn direction="up" delay={0.3}>
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Config Form - Premium wrapper */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
            >
              <Card className="relative overflow-hidden border-border/50">
                {/* Premium accent */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-600/60 to-transparent" />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600/15 to-blue-500/15 ring-1 ring-blue-600/20">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Twin Configuration</CardTitle>
                      <CardDescription className="text-xs">
                        Customize your digital twin&apos;s personality and behavior
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <TwinConfigForm
                    initialData={twinConfig ?? undefined}
                    personalityProfile={personalityProfile}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Chat Preview - Premium */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
            >
              <Card className="relative overflow-hidden border-border/50 group">
                {/* Premium accent */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
                {/* Subtle background pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(30,64,175,0.04),transparent_60%)] pointer-events-none" />
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/15 ring-1 ring-blue-500/20">
                      <Zap className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Chat Preview</CardTitle>
                      <CardDescription className="text-xs">
                        How your Digital Twin appears to subscribers
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
                    {/* Chat Header Preview */}
                    <motion.div
                      className="flex items-center gap-3 border-b border-border/60 pb-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/20 to-blue-500/20 ring-2 ring-blue-600/20">
                          <Bot className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                        </div>
                        <motion.div
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Your AI Twin</p>
                        <p className="text-[11px] text-slate-500">
                          AI Digital Twin
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Online</span>
                      </div>
                    </motion.div>

                    {/* Greeting Message Preview */}
                    <motion.div
                      className="mt-4 flex gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                    >
                      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-blue-600/10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600/20 to-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-400">
                          AI
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-xl rounded-tl-sm bg-card border border-border/60 p-3 shadow-sm max-w-[85%]">
                        <p className="text-sm leading-relaxed">{greeting}</p>
                      </div>
                    </motion.div>

                    {/* Simulated User Message */}
                    <motion.div
                      className="mt-4 flex justify-end gap-3"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.75, duration: 0.4 }}
                    >
                      <div className="rounded-xl rounded-tr-sm bg-gradient-to-br from-blue-600/15 to-blue-500/10 border border-blue-600/10 p-3 max-w-[85%]">
                        <p className="text-sm">
                          What can you help me with?
                        </p>
                      </div>
                      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/10">
                        <AvatarFallback className="text-xs font-bold bg-muted">U</AvatarFallback>
                      </Avatar>
                    </motion.div>

                    {/* Simulated Response */}
                    <motion.div
                      className="mt-4 flex gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9, duration: 0.4 }}
                    >
                      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-blue-600/10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600/20 to-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-400">
                          AI
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-xl rounded-tl-sm bg-card border border-border/60 p-3 shadow-sm max-w-[85%]">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          I can answer questions based on my expert&apos;s knowledge
                          base, covering their areas of expertise and published
                          content...
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </FadeIn>
    </PageTransition>
  );
}
