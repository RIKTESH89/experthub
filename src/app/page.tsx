import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  ArrowRight,
  Star,
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
  ScrollCounter,
  HoverCard,
  FloatingDeco,
  GlassNav,
} from "@/components/ui/animated-hero";

/* ================================================================
   DATA
   ================================================================ */

const features = [
  {
    icon: Brain,
    title: "AI Digital Twins",
    description: "Chat with AI replicas of top experts — available 24/7.",
    accent: "bg-[#1E40AF]",
  },
  {
    icon: Sparkles,
    title: "Expert Knowledge Base",
    description: "Curated, searchable databases of real expert insights.",
    accent: "bg-[#CA8A04]",
  },
  {
    icon: Target,
    title: "Personalized Learning",
    description: "Tailored answers based on your interests and context.",
    accent: "bg-[#22C55E]",
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
    description: "Gain deep, expert-backed insights.",
  },
];

const testimonials = [
  { name: "Priya S.", role: "Product Manager", content: "Like having a personal mentor always available.", rating: 5 },
  { name: "Arjun M.", role: "Startup Founder", content: "The AI twin responds with incredible accuracy.", rating: 5 },
  { name: "Neha R.", role: "Graduate Student", content: "Invaluable for my research — real expertise, not generic AI.", rating: 5 },
];

const pricingTiers = [
  {
    name: "Free Tier",
    price: "Free",
    description: "Follow experts and try their Digital Twin",
    features: ["Browse expert profiles", "Read all public posts", "Limited Digital Twin questions/month", "Bookmarks & collections"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium Tier",
    price: "Varies",
    period: "/mo per expert",
    description: "Each expert sets their own pricing",
    features: ["Unlimited Digital Twin chats", "All posts including exclusive content", "Priority responses with source citations", "Long-term memory across sessions"],
    cta: "Start Learning",
    popular: true,
  },
  {
    name: "For Experts",
    price: "Free",
    description: "Monetize your expertise with AI",
    features: ["Create your AI Digital Twin", "Build & manage knowledge base", "Set your own pricing tiers", "Analytics & subscriber management"],
    cta: "Apply as Expert",
    href: "#apply-expert",
    popular: false,
  },
];

const stats = [
  { value: 10000, suffix: "+", label: "Active Learners" },
  { value: 500, suffix: "+", label: "Expert Twins" },
  { value: 98, suffix: "%", label: "Satisfaction Rate" },
];

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
    <div className="min-h-screen bg-white overflow-x-hidden">
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

            <nav className="hidden items-center gap-8 md:flex">
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
                className="relative inline-flex h-9 items-center justify-center rounded-lg bg-[#22C55E] px-5 text-sm font-medium text-white shadow-lg shadow-[#22C55E]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#22C55E]/30 hover:brightness-110"
              >
                Sign Up
              </Link>
            </div>
          </div>
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
                <span className="bg-gradient-to-r from-[#1E40AF] via-[#22C55E] to-[#CA8A04] bg-clip-text text-transparent">
                  Digital Twins
                </span>
              </h1>
            </HeroText>

            <HeroText delay={0.3}>
              <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400 sm:text-xl leading-relaxed">
                Chat with AI replicas of top experts. Instant answers, 24/7.
              </p>
            </HeroText>

            <HeroText delay={0.45}>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="group relative inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-8 text-base font-medium text-white shadow-xl shadow-[#22C55E]/25 transition-all duration-300 hover:shadow-2xl hover:shadow-[#22C55E]/30 hover:brightness-110 hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/[0.15] px-8 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.25]"
                >
                  Sign In
                </Link>
              </div>
            </HeroText>

            {/* Social proof */}
            <HeroText delay={0.6}>
              <div className="mt-12 flex items-center justify-center gap-4">
                <div className="flex -space-x-2.5">
                  {["PS", "AM", "NR", "VK"].map((initials, i) => (
                    <div
                      key={i}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-[#030303] bg-gradient-to-br from-[#1E40AF] to-[#22C55E] text-[10px] font-bold text-white shadow-sm"
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-slate-400">
                  Trusted by <span className="font-semibold text-slate-200">experts & learners</span>
                </span>
              </div>
            </HeroText>
          </div>
        </div>
      </HeroAnimated>

      {/* ==================== STATS BAR ==================== */}
      <section className="relative z-10 -mt-10 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC]">
        <ScrollReveal>
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-[#1E40AF]/10 bg-white px-6 py-6 shadow-xl shadow-[#1E40AF]/5 sm:px-10 sm:py-8">
              <div className="grid grid-cols-3 divide-x divide-[#1E40AF]/10">
                {stats.map((stat) => (
                  <div key={stat.label} className="px-4 text-center">
                    <div className="text-2xl font-bold text-[#1E40AF] sm:text-3xl lg:text-4xl tabular-nums">
                      <ScrollCounter value={stat.value} suffix={stat.suffix} />
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

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

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="relative bg-[#F8FAFC] pb-20 pt-20 sm:pb-24 sm:pt-24">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#1E40AF] to-[#22C55E]" />
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Loved by Learners
              </h2>
              <p className="mt-4 text-slate-600 text-lg">
                See what our community has to say
              </p>
            </div>
          </ScrollReveal>

          <ScrollStagger className="mt-14 grid gap-6 sm:grid-cols-3" staggerDelay={0.15}>
            {testimonials.map((t) => (
              <ScrollStaggerItem key={t.name}>
                <HoverCard>
                  <div className="relative overflow-hidden rounded-2xl border border-[#1E40AF]/10 bg-white p-6 sm:p-7 transition-shadow duration-500 hover:shadow-xl hover:shadow-[#1E40AF]/5 group">
                    {/* Animated top accent */}
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#1E40AF]/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    {/* Quote mark */}
                    <div className="absolute -right-1 -top-1 text-[#1E40AF]/[0.06]">
                      <svg width="36" height="30" viewBox="0 0 40 32" aria-hidden="true">
                        <path
                          d="M12 0C5.4 0 0 5.4 0 12c0 8 6 16 14 20l2-4c-4-2-7-6-8-10 1 0 2 0 4-1 4-2 6-5 6-9C18 3.6 15.4 0 12 0zm20 0c-6.6 0-12 5.4-12 12 0 8 6 16 14 20l2-4c-4-2-7-6-8-10 1 0 2 0 4-1 4-2 6-5 6-9 0-4.4-2.6-8-6-8z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>

                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[#CA8A04] text-[#CA8A04]" />
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-slate-600 leading-relaxed sm:text-base">&ldquo;{t.content}&rdquo;</p>
                    <div className="mt-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1E40AF] to-[#22C55E] text-xs font-semibold text-white shadow-lg shadow-[#1E40AF]/20">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-500">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </HoverCard>
              </ScrollStaggerItem>
            ))}
          </ScrollStagger>
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
                Start free, upgrade when you&apos;re ready
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
                          Most Popular
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
                        className="mt-10 flex h-12 items-center justify-center rounded-xl bg-[#22C55E] text-sm font-semibold text-white shadow-xl shadow-[#22C55E]/25 transition-all duration-300 hover:shadow-2xl hover:brightness-110 hover:-translate-y-0.5"
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
                  <div className="h-48 w-96 rounded-full bg-[#22C55E]/[0.08] backdrop-blur-sm" />
                </FloatingDeco>
              </div>

              <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-[#22C55E]/10 blur-3xl" />

              <div className="relative z-10">
                <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Ready to Learn from the Best?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                  Join thousands of learners already benefiting from expert AI twins
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    href="/login"
                    className="group inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-8 text-base font-semibold text-white shadow-xl shadow-[#22C55E]/25 transition-all duration-300 hover:shadow-2xl hover:brightness-110 hover:-translate-y-0.5"
                  >
                    Get Started Free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/20 px-8 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/30"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

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
                  { label: "Blog", href: "/about" },
                  { label: "Careers", href: "/about" },
                  { label: "Contact", href: "/about" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-slate-500 transition-colors hover:text-slate-900">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "Privacy Policy", href: "/about" },
                  { label: "Terms of Service", href: "/about" },
                  { label: "Cookie Policy", href: "/about" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-slate-500 transition-colors hover:text-slate-900">{item.label}</Link>
                  </li>
                ))}
              </ul>
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
