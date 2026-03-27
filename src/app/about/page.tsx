import Link from "next/link";
import { Sparkles, Brain, Zap, MessageSquare, GitBranch } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ==================== NAVIGATION ==================== */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ExpertHub</span>
          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-noise">
        <div className="animate-float absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="animate-float-delayed absolute -right-32 top-20 h-[400px] w-[400px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
        <div className="bg-dot-pattern absolute inset-0 opacity-50" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center sm:py-28 lg:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-sm text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            Our Story
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            About <span className="text-gradient">ExpertHub</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            We are building the bridge between world-class experts and curious
            learners through AI Digital Twins — faithful replicas of real people
            who share knowledge around the clock.
          </p>
        </div>
      </section>

      {/* ==================== OUR MISSION ==================== */}
      <section className="relative bg-muted/30 py-20 sm:py-28">
        <div className="bg-grid-pattern absolute inset-0 opacity-40" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Our Mission
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Expertise should not be locked behind geography, schedules, or
            prohibitive consulting fees. ExpertHub makes deep, domain-specific
            knowledge accessible to anyone, anywhere, at any time. Every expert
            who joins the platform creates an AI Digital Twin — a conversational
            replica trained on their unique insights, writing, and thinking
            style — so learners can tap into real expertise without waiting for
            office hours.
          </p>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="relative py-20 sm:py-28 bg-noise">
        <div className="animate-float-slow absolute left-10 top-1/4 h-[250px] w-[250px] rounded-full bg-indigo-500/10 blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {/* Subscribe */}
            <div className="gradient-border group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <div className="relative rounded-2xl bg-card p-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="text-gradient text-3xl font-bold opacity-30">01</span>
                <h3 className="mt-1 text-xl font-semibold">Subscribe</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Browse our catalog of verified experts and subscribe to the
                  ones whose knowledge matters most to you.
                </p>
              </div>
            </div>

            {/* Ask */}
            <div className="gradient-border group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <div className="relative rounded-2xl bg-card p-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <span className="text-gradient text-3xl font-bold opacity-30">02</span>
                <h3 className="mt-1 text-xl font-semibold">Ask</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Chat with their AI Digital Twin in natural language. Ask
                  follow-ups, dive deeper, and get cited sources — all in
                  real time.
                </p>
              </div>
            </div>

            {/* Learn */}
            <div className="gradient-border group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
              <div className="relative rounded-2xl bg-card p-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <span className="text-gradient text-3xl font-bold opacity-30">03</span>
                <h3 className="mt-1 text-xl font-semibold">Learn</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Gain deep, expert-backed insights that evolve with every
                  conversation. Long-term memory means the Twin remembers your
                  context over time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WHY EXPERTHUB ==================== */}
      <section className="relative bg-muted/30 py-20 sm:py-28">
        <div className="bg-dot-pattern absolute inset-0 opacity-30" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Why ExpertHub
            </h2>
            <p className="mt-4 text-muted-foreground">
              Three core technologies that set us apart from generic AI chatbots.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {/* Personality Replication */}
            <div className="glass relative overflow-hidden rounded-2xl border border-border/30 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10">
                <Brain className="h-6 w-6 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold">Personality Replication</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Our analysis engine captures an expert&apos;s tone, vocabulary,
                reasoning patterns, and communication style so the Digital Twin
                genuinely sounds like them — not like a generic assistant.
              </p>
            </div>

            {/* Long-term Memory */}
            <div className="glass relative overflow-hidden rounded-2xl border border-border/30 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/10">
                <Zap className="h-6 w-6 text-violet-500" />
              </div>
              <h3 className="text-lg font-semibold">Long-term Memory</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every conversation builds on the last. The Twin remembers your
                goals, prior questions, and learning trajectory, delivering
                increasingly relevant answers over time.
              </p>
            </div>

            {/* Knowledge Graph */}
            <div className="glass relative overflow-hidden rounded-2xl border border-border/30 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10">
                <GitBranch className="h-6 w-6 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold">Knowledge Graph</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Expert content is structured into an interconnected knowledge
                graph. This means answers cite real sources and surface related
                concepts you might not have thought to ask about.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="relative py-20 sm:py-28 bg-noise">
        <div className="animate-float-delayed absolute right-10 top-1/4 h-[250px] w-[250px] rounded-full bg-violet-500/10 blur-[80px]" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Learn from the Best?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join thousands of learners already chatting with expert Digital
            Twins.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-base font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
            >
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-8 text-base font-medium backdrop-blur-sm transition-all hover:bg-muted"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-border/50 bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} ExpertHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
