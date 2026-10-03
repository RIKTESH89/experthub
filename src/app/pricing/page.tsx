import Link from "next/link";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";

import { publicPricingTiers as pricingTiers } from "@/lib/public-launch-copy";
import { publicPageMetadata } from "@/lib/public-metadata";
export function generateMetadata() { return publicPageMetadata("/pricing", "ExpertHub — Access and pricing"); }

const faqs = [
  { question: "Am I speaking to the expert?", answer: "No. A Digital Twin is an AI representation informed by expert content and settings. It generates new answers that can be inaccurate or differ from the expert’s current views. Check available sources and contact the expert directly when their own judgment matters." },
  { question: "What can I use for free?", answer: "You can explore public content and available free expert plans. Without an active subscription, trial chat uses an expert-specific question allowance. That allowance is cumulative; it is not a monthly refill. Review the expert’s profile for the current allowance and available plans." },
  { question: "How does paid access work?", answer: "Each expert configures their paid plan price. Review the amount and billing details shown at checkout before paying. Paid access is confirmed after the payment service verifies the subscription; the checkout callback alone is not confirmation." },
  { question: "What should I check before subscribing?", answer: "Check the expert’s current plan, price and available content. Cancellation, refund and data retention terms need approved published policies; this page does not promise a refund, payout schedule or access to chat history after cancellation." },
];

export default function PricingPage() {
  return (
    <div className="public-launch min-h-screen bg-background">
      <a className="public-skip-link" href="#main-content">Skip to content</a>
      {/* ==================== NAVIGATION ==================== */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <svg viewBox="0 0 512 512" className="h-8 w-8 shrink-0 rounded-lg" aria-hidden="true">
              <rect width="512" height="512" rx="112" fill="#312E81"/>
              <rect x="140" y="128" width="36" height="256" rx="4" fill="white"/>
              <rect x="176" y="128" width="180" height="30" rx="4" fill="white"/>
              <rect x="176" y="225" width="120" height="30" rx="4" fill="white"/>
              <rect x="316" y="225" width="40" height="30" rx="4" fill="white" opacity="0.5"/>
              <rect x="176" y="354" width="180" height="30" rx="4" fill="white"/>
              <circle cx="378" cy="240" r="8" fill="white" opacity="0.3"/>
              <circle cx="400" cy="240" r="5" fill="white" opacity="0.15"/>
            </svg>
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

      <main id="main-content" tabIndex={-1}>
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-noise">
        <div className="animate-float absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="animate-float-delayed absolute -right-32 top-20 h-[400px] w-[400px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
        <div className="bg-dot-pattern absolute inset-0 opacity-50" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-sm text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            Pricing
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Simple, <span className="text-gradient">Transparent</span> Pricing
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Explore available free plans. Review each expert’s paid plan and checkout details before subscribing.
          </p>
        </div>
      </section>

      {/* ==================== PRICING TIERS ==================== */}
      <section className="relative bg-muted/30 py-20 sm:py-28">
        <div className="bg-grid-pattern absolute inset-0 opacity-40" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative overflow-hidden rounded-2xl bg-card p-8 transition-all duration-300 hover:scale-[1.02] ${
                  tier.popular
                    ? "gradient-border animate-pulse-glow z-10 "
                    : "border border-border/50 shadow-warm hover:shadow-warm-md"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2">
                    <div className="rounded-b-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1 text-xs font-medium text-white">
                      Paid access
                    </div>
                  </div>
                )}

                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-gradient text-4xl font-bold">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-muted-foreground">
                      {tier.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tier.description}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href ?? "/login"}
                  className={`mt-8 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all ${
                    tier.popular
                      ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:brightness-110"
                      : "border border-border bg-background hover:bg-muted"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className="relative py-20 sm:py-28 bg-noise">
        <div className="animate-float-slow absolute left-10 top-1/4 h-[250px] w-[250px] rounded-full bg-indigo-500/10 blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-14 space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="glass overflow-hidden rounded-2xl border border-border/30 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <h3 className="text-base font-semibold">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="relative bg-muted/30 py-20 sm:py-28">
        <div className="bg-dot-pattern absolute inset-0 opacity-30" />

        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sign in to explore expert profiles, available plans and AI conversations.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-base font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      </main>
      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-border/50 bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} ExpertHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
