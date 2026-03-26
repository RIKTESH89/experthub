import Link from "next/link";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";

const pricingTiers = [
  {
    name: "Free Tier",
    price: "$0",
    description: "Follow experts and try their Digital Twin",
    features: [
      "Browse expert profiles",
      "Read all public posts",
      "Limited Digital Twin questions/month",
      "Bookmarks & collections",
      "Basic search",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium Tier",
    price: "Varies",
    period: "/mo per expert",
    description: "Each expert sets their own pricing",
    features: [
      "Unlimited Digital Twin chats",
      "All posts including exclusive content",
      "Priority responses with source citations",
      "Long-term memory across sessions",
      "Bookmarks & collections",
    ],
    cta: "Start Learning",
    popular: true,
  },
  {
    name: "For Experts",
    price: "Free",
    description: "Monetize your expertise with AI",
    features: [
      "Create your AI Digital Twin",
      "Build & manage knowledge base",
      "Set your own pricing tiers",
      "Analytics & subscriber management",
      "Personality analysis",
      "Embeddable chat widget",
    ],
    cta: "Become an Expert",
    popular: false,
  },
];

const faqs = [
  {
    question: "How does the Digital Twin actually work?",
    answer:
      "When an expert joins ExpertHub, our system analyzes their writing, posts, and provided content to build an AI model that mirrors their tone, reasoning style, and domain knowledge. Subscribers then chat with this model just like messaging the expert directly.",
  },
  {
    question: "Can I subscribe to multiple experts?",
    answer:
      "Yes. Each expert sets their own subscription price. You can subscribe to as many experts as you like, and each subscription is billed independently on a monthly basis.",
  },
  {
    question: "What do I get on the Free tier?",
    answer:
      "The Free tier lets you browse expert profiles, read all public posts, and ask a limited number of questions to any expert's Digital Twin each month. Upgrade to Premium for unlimited chats and exclusive content.",
  },
  {
    question: "How do experts get paid?",
    answer:
      "Experts receive the majority of their subscription revenue. Payouts are processed monthly. The analytics dashboard gives full visibility into subscriber counts, engagement, and earnings.",
  },
  {
    question: "What happens to my chat history if I cancel?",
    answer:
      "Your conversation history and bookmarks remain accessible in read-only mode. If you resubscribe, full access resumes and the Digital Twin retains the long-term memory from your previous sessions.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
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
            Start for free. Subscribe to the experts you care about. No hidden
            fees, cancel anytime.
          </p>
        </div>
      </section>

      {/* ==================== PRICING TIERS ==================== */}
      <section className="relative bg-muted/30 py-20 sm:py-28">
        <div className="bg-grid-pattern absolute inset-0 opacity-40" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative overflow-hidden rounded-2xl bg-card p-8 transition-all duration-300 hover:scale-[1.02] ${
                  tier.popular
                    ? "gradient-border animate-pulse-glow z-10 scale-[1.03] sm:scale-105"
                    : "border border-border/50 shadow-warm hover:shadow-warm-md"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2">
                    <div className="rounded-b-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1 text-xs font-medium text-white">
                      Most Popular
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
                  href="/register"
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
            Create your free account and start exploring expert knowledge today.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-base font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
            >
              Sign Up Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
