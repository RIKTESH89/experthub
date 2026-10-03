import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Sparkles,
  Brain,
  Target,
} from "lucide-react";
import { ExpertApplicationSection } from "@/components/landing/expert-application-section";
import {
  HeroAnimated,
  HeroText,
  ScrollReveal,
  ScrollStagger,
  ScrollStaggerItem,
  AnimatedGradientBorder,
  HoverCard,
  FloatingDeco,
  GlassNav,
} from "@/components/ui/animated-hero";

import { publicPricingTiers as pricingTiers } from "@/lib/public-launch-copy";
import { publicPageMetadata } from "@/lib/public-metadata";

/* ================================================================
   DATA
   ================================================================ */

const features = [
  {
    icon: Brain,
    title: "AI Digital Twins",
    description: "Explore AI conversations informed by content an expert provides.",
    accent: "bg-[#1E40AF]",
  },
  {
    icon: Sparkles,
    title: "Expert Knowledge Base",
    description: "Searchable content provided by experts.",
    accent: "bg-[#CA8A04]",
  },
  {
    icon: Target,
    title: "Personalized Learning",
    description: "Tailored answers based on your interests and context.",
    accent: "bg-[#15803D]",
  },
];

const steps = [
  {
    num: "01",
    title: "Subscribe",
    description: "Pick experts you want to learn from.",
  },
  {
    num: "02",
    title: "Ask",
    description: "Chat with their AI Digital Twin anytime.",
  },
  {
    num: "03",
    title: "Learn",
    description: "Explore answers and check their sources.",
  },
];

export function generateMetadata() { return publicPageMetadata("/", "ExpertHub — Expert knowledge, AI conversations"); }

/* ================================================================ */

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string }).role || "";
    if (role === "ADMIN") redirect("/admin");
    if (role === "EXPERT") redirect("/expert");
    redirect("/subscriber/feed");
  }

  return (
    <div className="public-launch min-h-screen bg-white text-slate-900">
      <a className="public-skip-link" href="#main-content">Skip to content</a>
      <main id="main-content" tabIndex={-1}>
      {/* ==================== HERO SECTION (Dark + Pillar Silhouette) ==================== */}
      <HeroAnimated>
        {/* ==================== NAVIGATION ==================== */}
        <GlassNav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#030303]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <svg viewBox="0 0 512 512" className="h-9 w-9 shrink-0 rounded-xl shadow-lg shadow-[#1E40AF]/20 transition-transform duration-300 group-hover:scale-105" aria-hidden="true">
                <rect width="512" height="512" rx="112" fill="#1E40AF"/>
                <rect x="140" y="128" width="36" height="256" rx="4" fill="white"/>
                <rect x="176" y="128" width="180" height="30" rx="4" fill="white"/>
                <rect x="176" y="225" width="120" height="30" rx="4" fill="white"/>
                <rect x="316" y="225" width="40" height="30" rx="4" fill="white" opacity="0.5"/>
                <rect x="176" y="354" width="180" height="30" rx="4" fill="white"/>
                <circle cx="378" cy="240" r="8" fill="white" opacity="0.3"/>
                <circle cx="400" cy="240" r="5" fill="white" opacity="0.15"/>
              </svg>
              <span className="text-xl font-bold tracking-tight text-white">ExpertHub</span>
            </Link>

            <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
              {[
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
                Log In
              </Link>
              <Link
                href="/login"
                className="relative inline-flex h-11 items-center justify-center rounded-lg bg-[#15803D] px-5 text-sm font-medium text-white shadow-lg shadow-[#22C55E]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#22C55E]/30 hover:brightness-110"
              >
                Sign Up
              </Link>
            </div>
          </div>
          <nav aria-label="Mobile navigation" className="flex justify-center gap-4 border-t border-white/10 px-3 md:hidden">
            <a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a>
          </nav>
        </GlassNav>

        {/* ==================== HERO CONTENT ==================== */}
        <div className="mx-auto max-w-7xl px-4 py-32 sm:px-6 sm:py-40 lg:px-8 lg:py-48">
          <div className="mx-auto max-w-3xl text-center">
            <HeroText delay={0}>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 py-1.5 text-sm text-slate-300 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#22C55E]" />
                AI-Powered Expert Platform
              </div>
            </HeroText>

            <HeroText delay={0.15}>
              <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl">
                Learn from Expert{" "}
                <span className="bg-gradient-to-r from-[#60A5FA] via-[#4ADE80] to-[#FACC15] bg-clip-text text-transparent">
                  Digital Twins
                </span>
              </h1>
            </HeroText>

            <HeroText delay={0.3}>
              <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400 sm:text-xl leading-relaxed">
                Ask an AI representation informed by expert content. Answers are generated by AI, can be wrong, and may not reflect the expert’s current views.
              </p>
            </HeroText>

            <HeroText delay={0.45}>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="group relative inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-8 text-base font-medium text-white shadow-xl shadow-[#22C55E]/25 transition-all duration-300 hover:shadow-2xl hover:shadow-[#22C55E]/30 hover:brightness-110 hover:-translate-y-0.5"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.15] px-8 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.25]"
                >
                  Sign In
                </Link>
              </div>
            </HeroText>


          </div>
        </div>
      </HeroAnimated>

      {/* ==================== FEATURES SECTION ==================== */}
      <section id="features" className="relative bg-[#F8FAFC] pb-20 pt-20 sm:pb-28 sm:pt-24">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#1E40AF] to-[#22C55E]" />
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Why ExpertHub?
              </h2>
              <p className="mt-4 text-slate-600 text-lg">
                Everything you need to learn from the world&apos;s best minds
              </p>
            </div>
          </ScrollReveal>

          <ScrollStagger className="mt-16 grid gap-8 sm:grid-cols-3" staggerDelay={0.15}>
            {features.map((feature) => (
              <ScrollStaggerItem key={feature.title}>
                <HoverCard>
                  <div className="group relative overflow-hidden rounded-2xl border border-[#1E40AF]/10 bg-white transition-shadow duration-500 hover:shadow-xl hover:shadow-[#1E40AF]/10">
                    <div className="relative p-6 sm:p-8">
                      {/* Hover gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1E40AF]/[0.03] to-[#22C55E]/[0.03] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                      {/* Icon */}
                      <div className={`relative mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.accent} text-white shadow-lg`}>
                        <feature.icon className="h-6 w-6" />
                      </div>

                      <h3 className="relative text-lg font-semibold text-slate-900 sm:text-xl">{feature.title}</h3>
                      <p className="relative mt-2 text-sm text-slate-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </HoverCard>
              </ScrollStaggerItem>
            ))}
          </ScrollStagger>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="relative py-20 sm:py-28 bg-white overflow-hidden">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#1E40AF] to-[#22C55E]" />
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Three Simple Steps
              </h2>
              <p className="mt-4 text-slate-600 text-lg">
                Start learning from expert AI twins in minutes
              </p>
            </div>
          </ScrollReveal>

          <div className="relative mt-20">
            {/* Connecting line (desktop) */}
            <div className="absolute left-0 right-0 top-10 hidden sm:block">
              <div className="mx-auto h-[2px] max-w-[80%] bg-gradient-to-r from-transparent via-[#1E40AF]/20 to-transparent" />
            </div>

            <ScrollStagger className="grid gap-12 sm:grid-cols-3 sm:gap-10" staggerDelay={0.2}>
              {steps.map((step) => (
                <ScrollStaggerItem key={step.num}>
                  <div className="relative text-center group">
                    {/* Step number circle */}
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#1E40AF]/20 bg-[#F8FAFC] transition-all duration-500 group-hover:border-[#1E40AF]/40 group-hover:shadow-lg group-hover:shadow-[#1E40AF]/10">
                      <span className="text-2xl font-bold text-[#1E40AF]">{step.num}</span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.description}</p>
                  </div>
                </ScrollStaggerItem>
              ))}
            </ScrollStagger>
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section id="pricing" className="relative py-20 sm:py-28 bg-white overflow-hidden">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#1E40AF] to-[#22C55E]" />
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Simple Pricing
              </h2>
              <p className="mt-4 text-slate-600 text-lg">
                Free and paid access depend on each expert’s available plans.
              </p>
            </div>
          </ScrollReveal>

          <ScrollStagger className="mt-16 grid items-center gap-8 sm:grid-cols-3" staggerDelay={0.15}>
            {pricingTiers.map((tier) => (
              <ScrollStaggerItem key={tier.name}>
                <HoverCard>
                  {tier.popular ? (
                    <AnimatedGradientBorder
                      containerClassName="sm:scale-105 z-10"
                      className="p-8 sm:p-10"
                    >
                      <div className="absolute -top-px left-1/2 -translate-x-1/2">
                        <div className="rounded-b-lg bg-gradient-to-r from-[#1E40AF] to-[#22C55E] px-5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[#1E40AF]/30">
                          Paid access
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-[#1E40AF]">{tier.price}</span>
                        {tier.period && (
                          <span className="text-sm text-slate-500">{tier.period}</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-slate-500">{tier.description}</p>

                      <ul className="mt-8 space-y-3">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" />
                            <span className="text-sm text-slate-600">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={tier.href ?? "/login"}
                        className="mt-10 flex h-12 items-center justify-center rounded-xl bg-[#15803D] text-sm font-semibold text-white shadow-xl shadow-[#22C55E]/25 transition-all duration-300 hover:shadow-2xl hover:brightness-110 hover:-translate-y-0.5"
                      >
                        {tier.cta}
                      </Link>
                    </AnimatedGradientBorder>
                  ) : (
                    <div className="relative overflow-hidden rounded-2xl border border-[#1E40AF]/10 bg-white p-8 shadow-sm transition-all duration-500 hover:shadow-lg hover:border-[#1E40AF]/20">
                      <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-[#1E40AF]">{tier.price}</span>
                        {tier.period && (
                          <span className="text-sm text-slate-500">{tier.period}</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-slate-500">{tier.description}</p>

                      <ul className="mt-8 space-y-3">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#1E40AF]" />
                            <span className="text-sm text-slate-600">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Link
                        href={tier.href ?? "/login"}
                        className="mt-10 flex h-12 items-center justify-center rounded-xl border border-[#1E40AF]/20 bg-[#F8FAFC] text-sm font-medium text-[#1E40AF] transition-all duration-300 hover:bg-[#1E40AF] hover:text-white hover:-translate-y-0.5"
                      >
                        {tier.cta}
                      </Link>
                    </div>
                  )}
                </HoverCard>
              </ScrollStaggerItem>
            ))}
          </ScrollStagger>
        </div>
      </section>

      {/* ==================== APPLY AS EXPERT ==================== */}
      <ExpertApplicationSection />

      {/* ==================== CTA BANNER ==================== */}
      <section className="border-t border-[#1E40AF]/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E40AF] via-[#1E40AF] to-[#030303] px-8 py-16 text-center sm:px-16 sm:py-20">
              {/* Decorative shapes */}
              <div className="absolute inset-0 overflow-hidden">
                <FloatingDeco amplitude={8} duration={7} className="absolute -left-10 -top-10">
                  <div className="h-40 w-80 rounded-full bg-white/[0.06] backdrop-blur-sm" />
                </FloatingDeco>
                <FloatingDeco amplitude={10} duration={9} delay={2} className="absolute -bottom-8 -right-8">
                  <div className="h-48 w-96 rounded-full bg-[#15803D]/[0.08] backdrop-blur-sm" />
                </FloatingDeco>
              </div>

              <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-[#15803D]/10 blur-3xl" />

              <div className="relative z-10">
                <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Ready to Learn from the Best?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                  Explore expert content and AI conversations at your own pace.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    href="/login"
                    className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-8 text-base font-semibold text-white shadow-xl shadow-[#22C55E]/25 transition-all duration-300 hover:shadow-2xl hover:brightness-110 hover:-translate-y-0.5"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-8 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/30"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-[#1E40AF]/10 bg-[#F8FAFC]/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 group">
                <svg viewBox="0 0 512 512" className="h-9 w-9 shrink-0 rounded-xl transition-transform duration-300 group-hover:scale-105" aria-hidden="true">
                  <rect width="512" height="512" rx="112" fill="#1E40AF"/>
                  <rect x="140" y="128" width="36" height="256" rx="4" fill="white"/>
                  <rect x="176" y="128" width="180" height="30" rx="4" fill="white"/>
                  <rect x="176" y="225" width="120" height="30" rx="4" fill="white"/>
                  <rect x="316" y="225" width="40" height="30" rx="4" fill="white" opacity="0.5"/>
                  <rect x="176" y="354" width="180" height="30" rx="4" fill="white"/>
                  <circle cx="378" cy="240" r="8" fill="white" opacity="0.3"/>
                  <circle cx="400" cy="240" r="5" fill="white" opacity="0.15"/>
                </svg>
                <span className="text-lg font-bold text-slate-900">ExpertHub</span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                Connect with expert minds through AI-powered Digital Twins.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900">Product</h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Features", href: "/#features" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "How It Works", href: "/#how-it-works" },
                  { label: "For Experts", href: "#apply-expert" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-slate-500 transition-colors hover:text-slate-900">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900">Company</h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "About", href: "/about" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-slate-500 transition-colors hover:text-slate-900">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900">Before you share</h4>
              <p className="mt-4 text-sm text-slate-600">AI answers can be inaccurate. Avoid sharing sensitive information in chats or applications.</p>
            </div>
          </div>

          <div className="mt-14 border-t border-[#1E40AF]/10 pt-8 text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} ExpertHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
