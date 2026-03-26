import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  ArrowRight,
  Star,
  CheckCircle,
  Sparkles,
} from "lucide-react";

/* ================================================================
   INLINE SVG ILLUSTRATIONS
   Professional, on-brand illustrations using the indigo/violet palette
   ================================================================ */

function HeroIllustration() {
  return (
    <svg viewBox="0 0 800 500" fill="none" className="w-full h-auto" aria-hidden="true">
      {/* Background elements */}
      <defs>
        <linearGradient id="hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="orb1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
        </linearGradient>
        <filter id="shadow1" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="12" floodColor="#6366f1" floodOpacity="0.15" />
        </filter>
        <filter id="shadow2" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="20" floodColor="#6366f1" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Decorative circles */}
      <circle cx="680" cy="80" r="60" fill="url(#orb1)" />
      <circle cx="120" cy="420" r="40" fill="url(#orb1)" />
      <circle cx="700" cy="400" r="30" fill="#6366f1" opacity="0.08" />

      {/* Dotted connection lines */}
      <line x1="300" y1="250" x2="500" y2="150" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.3" />
      <line x1="300" y1="250" x2="500" y2="250" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.3" />
      <line x1="300" y1="250" x2="500" y2="350" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.3" />

      {/* Central user figure */}
      <g filter="url(#shadow2)">
        <rect x="200" y="190" width="200" height="120" rx="16" fill="white" />
        <rect x="200" y="190" width="200" height="120" rx="16" stroke="#e0e7ff" strokeWidth="1" />
      </g>
      <circle cx="260" cy="235" r="22" fill="url(#card-grad)" />
      <circle cx="260" cy="228" r="8" fill="white" opacity="0.9" />
      <path d="M248 245 a12 10 0 0 1 24 0" fill="white" opacity="0.9" />
      <rect x="295" y="222" width="80" height="8" rx="4" fill="#e0e7ff" />
      <rect x="295" y="238" width="55" height="6" rx="3" fill="#f1f5f9" />
      {/* Chat bubble inside */}
      <rect x="225" y="270" width="150" height="28" rx="8" fill="#f5f3ff" />
      <rect x="235" y="279" width="80" height="5" rx="2.5" fill="#c4b5fd" />
      <circle cx="375" y="284" r="6" fill="url(#card-grad)" />
      <path d="M372 283 l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Expert Twin Card 1 - top */}
      <g filter="url(#shadow1)">
        <rect x="480" y="90" width="220" height="120" rx="16" fill="white" />
        <rect x="480" y="90" width="220" height="120" rx="16" stroke="#e0e7ff" strokeWidth="1" />
      </g>
      <rect x="480" y="90" width="220" height="4" rx="2" fill="url(#card-grad)" />
      <circle cx="520" cy="135" r="18" fill="#ddd6fe" />
      <text x="520" y="140" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#6366f1">AI</text>
      <rect x="548" y="125" width="70" height="7" rx="3.5" fill="#e0e7ff" />
      <rect x="548" y="138" width="50" height="5" rx="2.5" fill="#f1f5f9" />
      {/* Mini knowledge items */}
      <rect x="498" y="165" width="60" height="24" rx="6" fill="#f5f3ff" />
      <rect x="506" y="174" width="35" height="4" rx="2" fill="#c4b5fd" />
      <rect x="568" y="165" width="60" height="24" rx="6" fill="#faf5ff" />
      <rect x="576" y="174" width="35" height="4" rx="2" fill="#d8b4fe" />
      <rect x="638" y="165" width="44" height="24" rx="6" fill="#f5f3ff" />
      <rect x="646" y="174" width="25" height="4" rx="2" fill="#c4b5fd" />
      {/* Sparkle */}
      <path d="M690 100 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3z" fill="#6366f1" opacity="0.5" />

      {/* Expert Twin Card 2 - middle */}
      <g filter="url(#shadow1)">
        <rect x="500" y="220" width="200" height="65" rx="14" fill="white" />
        <rect x="500" y="220" width="200" height="65" rx="14" stroke="#ede9fe" strokeWidth="1" />
      </g>
      <circle cx="534" cy="252" r="16" fill="#ede9fe" />
      <text x="534" y="257" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#8b5cf6">AI</text>
      <rect x="560" y="242" width="60" height="6" rx="3" fill="#e0e7ff" />
      <rect x="560" y="254" width="100" height="16" rx="8" fill="#f5f3ff" />
      <rect x="570" y="259" width="60" height="5" rx="2.5" fill="#c4b5fd" />

      {/* Expert Twin Card 3 - bottom */}
      <g filter="url(#shadow1)">
        <rect x="480" y="300" width="220" height="100" rx="16" fill="white" />
        <rect x="480" y="300" width="220" height="100" rx="16" stroke="#e0e7ff" strokeWidth="1" />
      </g>
      <rect x="480" y="300" width="220" height="4" rx="2" fill="#8b5cf6" />
      <circle cx="520" cy="340" r="18" fill="#f3e8ff" />
      <text x="520" y="345" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#8b5cf6">AI</text>
      <rect x="548" y="330" width="65" height="7" rx="3.5" fill="#ede9fe" />
      <rect x="548" y="343" width="45" height="5" rx="2.5" fill="#f1f5f9" />
      {/* Response preview */}
      <rect x="498" y="370" width="185" height="18" rx="6" fill="#faf5ff" />
      <rect x="508" y="376" width="100" height="4" rx="2" fill="#d8b4fe" />

      {/* Floating elements */}
      <path d="M160 140 l4 10 10 4 -10 4 -4 10 -4-10 -10-4 10-4z" fill="#8b5cf6" opacity="0.4" />
      <path d="M720 300 l3 7 7 3 -7 3 -3 7 -3-7 -7-3 7-3z" fill="#6366f1" opacity="0.35" />
      <circle cx="150" cy="300" r="4" fill="#6366f1" opacity="0.2" />
      <circle cx="750" cy="200" r="3" fill="#8b5cf6" opacity="0.25" />
    </svg>
  );
}

function FeatureIllustrationTwin() {
  return (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-auto" aria-hidden="true">
      <rect x="30" y="20" width="140" height="120" rx="16" fill="#f5f3ff" />
      <circle cx="75" cy="65" r="22" fill="#ddd6fe" />
      <circle cx="75" cy="58" r="8" fill="#6366f1" opacity="0.6" />
      <path d="M63 74 a12 9 0 0 1 24 0" fill="#6366f1" opacity="0.6" />
      {/* Arrow */}
      <path d="M105 65 h25" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M128 60 l7 5 -7 5" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* AI avatar */}
      <circle cx="155" cy="65" r="18" fill="url(#feat-grad)" />
      <text x="155" y="70" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">AI</text>
      {/* Chat lines */}
      <rect x="45" y="100" width="70" height="6" rx="3" fill="#e0e7ff" />
      <rect x="45" y="112" width="100" height="6" rx="3" fill="#ede9fe" />
      <rect x="45" y="124" width="55" height="6" rx="3" fill="#e0e7ff" />
      <defs>
        <linearGradient id="feat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FeatureIllustrationKnowledge() {
  return (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-auto" aria-hidden="true">
      <rect x="30" y="20" width="140" height="120" rx="16" fill="#faf5ff" />
      {/* Book / document stack */}
      <rect x="55" y="40" width="90" height="14" rx="4" fill="#ddd6fe" />
      <rect x="60" y="58" width="90" height="14" rx="4" fill="#c4b5fd" />
      <rect x="55" y="76" width="90" height="14" rx="4" fill="#ddd6fe" />
      {/* Search icon */}
      <circle cx="120" cy="110" r="12" stroke="#6366f1" strokeWidth="2.5" fill="white" />
      <line x1="129" y1="119" x2="137" y2="127" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      {/* Sparkle */}
      <path d="M65 110 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2z" fill="#8b5cf6" opacity="0.5" />
    </svg>
  );
}

function FeatureIllustrationPersonalized() {
  return (
    <svg viewBox="0 0 200 160" fill="none" className="w-full h-auto" aria-hidden="true">
      <rect x="30" y="20" width="140" height="120" rx="16" fill="#f5f3ff" />
      {/* User silhouette */}
      <circle cx="70" cy="55" r="14" fill="#ddd6fe" />
      <circle cx="70" cy="49" r="5" fill="#8b5cf6" opacity="0.5" />
      <path d="M62 62 a8 6 0 0 1 16 0" fill="#8b5cf6" opacity="0.5" />
      {/* Branching paths */}
      <line x1="90" y1="55" x2="120" y2="40" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="90" y1="55" x2="120" y2="55" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="90" y1="55" x2="120" y2="70" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Insight nodes */}
      <circle cx="130" cy="40" r="10" fill="#ede9fe" />
      <rect x="125" y="37" width="10" height="6" rx="2" fill="#6366f1" opacity="0.5" />
      <circle cx="130" cy="55" r="10" fill="#e0e7ff" />
      <rect x="125" y="52" width="10" height="6" rx="2" fill="#8b5cf6" opacity="0.5" />
      <circle cx="130" cy="70" r="10" fill="#ede9fe" />
      <rect x="125" y="67" width="10" height="6" rx="2" fill="#6366f1" opacity="0.5" />
      {/* Target/bullseye */}
      <circle cx="100" cy="110" r="16" stroke="#6366f1" strokeWidth="1.5" fill="none" opacity="0.3" />
      <circle cx="100" cy="110" r="10" stroke="#8b5cf6" strokeWidth="1.5" fill="none" opacity="0.4" />
      <circle cx="100" cy="110" r="4" fill="#6366f1" opacity="0.6" />
    </svg>
  );
}

function StepIllustration1() {
  return (
    <svg viewBox="0 0 180 140" fill="none" className="mx-auto w-40 h-auto" aria-hidden="true">
      {/* Card with checkmark */}
      <rect x="30" y="15" width="120" height="80" rx="14" fill="#f5f3ff" stroke="#e0e7ff" strokeWidth="1" />
      <rect x="30" y="15" width="120" height="4" rx="2" fill="url(#s1-grad)" />
      {/* Avatar row */}
      <circle cx="60" cy="48" r="12" fill="#ddd6fe" />
      <circle cx="60" cy="44" r="4.5" fill="#6366f1" opacity="0.5" />
      <path d="M54 53 a6 5 0 0 1 12 0" fill="#6366f1" opacity="0.5" />
      <rect x="80" y="42" width="50" height="5" rx="2.5" fill="#e0e7ff" />
      <rect x="80" y="52" width="35" height="4" rx="2" fill="#f1f5f9" />
      {/* Subscribe button */}
      <rect x="50" y="70" width="80" height="18" rx="9" fill="url(#s1-grad)" />
      <text x="90" y="83" textAnchor="middle" fontSize="9" fontWeight="600" fill="white">Subscribe</text>
      {/* Sparkle */}
      <path d="M140 25 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2z" fill="#6366f1" opacity="0.4" />
      <defs>
        <linearGradient id="s1-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StepIllustration2() {
  return (
    <svg viewBox="0 0 180 140" fill="none" className="mx-auto w-40 h-auto" aria-hidden="true">
      {/* Chat window */}
      <rect x="25" y="10" width="130" height="100" rx="14" fill="#f5f3ff" stroke="#e0e7ff" strokeWidth="1" />
      {/* Title bar */}
      <rect x="25" y="10" width="130" height="22" rx="14" fill="#ede9fe" />
      <rect x="25" y="22" width="130" height="10" fill="#ede9fe" />
      <circle cx="42" cy="21" r="3" fill="#c4b5fd" />
      <rect x="52" y="18" width="40" height="5" rx="2.5" fill="#ddd6fe" />
      {/* Messages */}
      <rect x="40" y="42" width="70" height="16" rx="8" fill="#e0e7ff" />
      <rect x="47" y="48" width="45" height="4" rx="2" fill="#a5b4fc" />
      <rect x="65" y="64" width="75" height="22" rx="8" fill="white" stroke="#ede9fe" strokeWidth="1" />
      <rect x="72" y="70" width="50" height="4" rx="2" fill="#c4b5fd" />
      <rect x="72" y="78" width="35" height="4" rx="2" fill="#e0e7ff" />
      {/* AI indicator */}
      <circle cx="145" cy="75" r="6" fill="url(#s2-grad)" />
      <text x="145" y="78" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white">AI</text>
      <defs>
        <linearGradient id="s2-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StepIllustration3() {
  return (
    <svg viewBox="0 0 180 140" fill="none" className="mx-auto w-40 h-auto" aria-hidden="true">
      {/* Brain / insight visual */}
      <rect x="30" y="15" width="120" height="90" rx="14" fill="#faf5ff" stroke="#ede9fe" strokeWidth="1" />
      {/* Graph lines */}
      <polyline points="50,80 70,60 90,70 110,45 130,50" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="80" r="3" fill="#6366f1" />
      <circle cx="70" cy="60" r="3" fill="#8b5cf6" />
      <circle cx="90" cy="70" r="3" fill="#6366f1" />
      <circle cx="110" cy="45" r="3" fill="#8b5cf6" />
      <circle cx="130" cy="50" r="3" fill="#6366f1" />
      {/* Lightbulb */}
      <circle cx="90" cy="30" r="8" fill="#ede9fe" />
      <rect x="87" y="37" width="6" height="4" rx="1" fill="#ddd6fe" />
      <line x1="90" y1="24" x2="90" y2="30" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="84" y1="28" x2="87" y2="30" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" />
      <line x1="96" y1="28" x2="93" y2="30" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" />
      {/* Sparkle */}
      <path d="M140 20 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2z" fill="#8b5cf6" opacity="0.5" />
    </svg>
  );
}

function QuoteSVG() {
  return (
    <svg width="32" height="26" viewBox="0 0 40 32" className="text-indigo-500/15" aria-hidden="true">
      <path
        d="M12 0C5.4 0 0 5.4 0 12c0 8 6 16 14 20l2-4c-4-2-7-6-8-10 1 0 2 0 4-1 4-2 6-5 6-9C18 3.6 15.4 0 12 0zm20 0c-6.6 0-12 5.4-12 12 0 8 6 16 14 20l2-4c-4-2-7-6-8-10 1 0 2 0 4-1 4-2 6-5 6-9 0-4.4-2.6-8-6-8z"
        fill="currentColor"
      />
    </svg>
  );
}

function WaveDivider({ flip = false, className = "" }: { flip?: boolean; className?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? "rotate-180" : ""} ${className}`}>
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="relative block h-[60px] w-full sm:h-[80px] md:h-[100px]">
        <path d="M0,40 C360,100 720,0 1080,60 C1260,80 1380,40 1440,50 L1440,100 L0,100 Z" className="fill-muted/30" />
        <path d="M0,60 C320,20 640,90 960,40 C1200,10 1360,70 1440,60 L1440,100 L0,100 Z" className="fill-muted/20" />
      </svg>
    </div>
  );
}

/* ================================================================ */

const features = [
  {
    illustration: FeatureIllustrationTwin,
    title: "AI Digital Twins",
    description: "Chat with AI replicas of top experts — available 24/7.",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    illustration: FeatureIllustrationKnowledge,
    title: "Expert Knowledge Base",
    description: "Curated, searchable databases of real expert insights.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    illustration: FeatureIllustrationPersonalized,
    title: "Personalized Learning",
    description: "Tailored answers based on your interests and context.",
    gradient: "from-violet-500 to-purple-500",
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
    cta: "Become an Expert",
    popular: false,
  },
];

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string }).role || "";
    if (role === "ADMIN") redirect("/admin");
    if (role === "EXPERT") redirect("/expert");
    redirect("/subscriber/feed");
  }

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

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Log In</Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative overflow-hidden bg-noise">
        {/* Animated gradient orbs */}
        <div className="animate-float absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="animate-float-delayed absolute -right-32 top-20 h-[400px] w-[400px] rounded-full bg-violet-500/20 blur-[120px]" />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
        <div className="bg-dot-pattern absolute inset-0 opacity-50" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:pb-24 lg:pt-28">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left: Compact text + CTAs */}
            <div className="animate-fade-in text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-sm text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Expert Platform
              </div>

              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Learn from Expert{" "}
                <span className="text-gradient">Digital Twins</span>
              </h1>

              <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg lg:mx-0">
                Chat with AI replicas of top experts. Instant answers, 24/7.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/register"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-base font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-8 text-base font-medium backdrop-blur-sm transition-all hover:bg-muted"
                >
                  Sign In
                </Link>
              </div>

              {/* Compact social proof */}
              <div className="mt-8 flex items-center justify-center gap-3 lg:justify-start">
                <div className="flex -space-x-2">
                  {["PS", "AM", "NR", "VK"].map((initials, i) => (
                    <div
                      key={i}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-indigo-400 to-violet-500 text-[10px] font-bold text-white"
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  Trusted by <span className="font-semibold text-gradient">experts & learners</span>
                </span>
              </div>
            </div>

            {/* Right: Hero SVG illustration */}
            <div className="animate-fade-in lg:order-last">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <WaveDivider />

      {/* ==================== FEATURES SECTION ==================== */}
      <section id="features" className="relative bg-muted/30 pb-20 pt-8 sm:pb-28 sm:pt-12">
        <div className="bg-grid-pattern absolute inset-0 opacity-40" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Why ExpertHub?
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="gradient-border group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                <div className="relative rounded-2xl bg-card p-6">
                  {/* SVG Illustration */}
                  <div className="mb-4">
                    <feature.illustration />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wave divider flipped */}
      <WaveDivider flip className="-mt-px bg-muted/30" />

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="relative py-20 sm:py-28 bg-noise">
        <div className="animate-float-slow absolute left-10 top-1/4 h-[250px] w-[250px] rounded-full bg-indigo-500/10 blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Three Simple Steps
            </h2>
          </div>

          <div className="relative mt-16 grid gap-10 sm:grid-cols-3">
            {/* SVG connecting line (desktop) */}
            <svg
              className="absolute left-0 right-0 top-20 hidden sm:block"
              height="4"
              style={{ width: "100%" }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(239 84% 67%)" stopOpacity="0" />
                  <stop offset="20%" stopColor="hsl(239 84% 67%)" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="hsl(271 81% 56%)" stopOpacity="0.3" />
                  <stop offset="80%" stopColor="hsl(239 84% 67%)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(239 84% 67%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect width="100%" height="2" y="1" rx="1" fill="url(#line-grad)" />
            </svg>

            {/* Step 1 */}
            <div className="relative text-center">
              <StepIllustration1 />
              <span className="text-gradient mt-4 block text-3xl font-bold opacity-30">01</span>
              <h3 className="mt-1 text-xl font-semibold">Subscribe</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pick experts you want to learn from.</p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <StepIllustration2 />
              <span className="text-gradient mt-4 block text-3xl font-bold opacity-30">02</span>
              <h3 className="mt-1 text-xl font-semibold">Ask</h3>
              <p className="mt-1 text-sm text-muted-foreground">Chat with their AI Digital Twin anytime.</p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <StepIllustration3 />
              <span className="text-gradient mt-4 block text-3xl font-bold opacity-30">03</span>
              <h3 className="mt-1 text-xl font-semibold">Learn</h3>
              <p className="mt-1 text-sm text-muted-foreground">Gain deep, expert-backed insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <WaveDivider />

      {/* ==================== TESTIMONIALS (compact) ==================== */}
      <section className="relative bg-muted/30 pb-16 pt-8 sm:pb-20 sm:pt-12">
        <div className="bg-dot-pattern absolute inset-0 opacity-30" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by Learners
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="glass relative overflow-hidden rounded-2xl border border-border/30 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="absolute -right-1 -top-1 opacity-50">
                  <QuoteSVG />
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">&ldquo;{t.content}&rdquo;</p>
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wave divider flipped */}
      <WaveDivider flip className="-mt-px bg-muted/30" />

      {/* ==================== PRICING ==================== */}
      <section id="pricing" className="relative py-20 sm:py-28 bg-noise">
        <div className="animate-float-delayed absolute right-10 top-1/4 h-[250px] w-[250px] rounded-full bg-violet-500/10 blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Simple Pricing
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
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
                  <span className="text-gradient text-4xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-sm text-muted-foreground">{tier.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>

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
                  className={`mt-8 flex h-11 items-center justify-center rounded-xl text-sm font-medium transition-all ${
                    tier.popular
                      ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:brightness-110"
                      : "border border-border bg-background hover:bg-muted"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA BANNER ==================== */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-8 py-14 text-center sm:px-16">
            {/* Decorative SVG shapes */}
            <div className="absolute inset-0 overflow-hidden">
              <svg className="animate-float absolute -left-10 -top-10 h-40 w-40 opacity-10" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" stroke="white" strokeWidth="2" fill="none" />
                <circle cx="80" cy="80" r="50" stroke="white" strokeWidth="1" fill="none" />
              </svg>
              <svg className="animate-float-delayed absolute -bottom-8 -right-8 h-48 w-48 opacity-10" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="2" fill="none" />
                <circle cx="100" cy="100" r="60" stroke="white" strokeWidth="1.5" fill="none" />
                <circle cx="100" cy="100" r="30" stroke="white" strokeWidth="1" fill="none" />
              </svg>
            </div>

            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10">
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to Learn from the Best?
              </h2>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50 hover:shadow-xl"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-8 text-base font-medium text-white transition-colors hover:bg-white/10"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-border/50 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-4">
            <div className="sm:col-span-1">
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
                <span className="text-lg font-bold">ExpertHub</span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Connect with expert minds through AI-powered Digital Twins.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold">Product</h4>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "Features", href: "/#features" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "How It Works", href: "/#how-it-works" },
                  { label: "For Experts", href: "/register" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold">Company</h4>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "About", href: "/about" },
                  { label: "Blog", href: "/about" },
                  { label: "Careers", href: "/about" },
                  { label: "Contact", href: "/about" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold">Legal</h4>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "Privacy Policy", href: "/about" },
                  { label: "Terms of Service", href: "/about" },
                  { label: "Cookie Policy", href: "/about" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ExpertHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
