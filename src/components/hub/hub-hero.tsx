import { SearchBar } from "./search-bar";

interface HubHeroProps {
  className?: string;
}

function ExpertIllustration() {
  return (
    <svg
      viewBox="0 0 360 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <filter id="card-shadow" x="-4%" y="-4%" width="108%" height="112%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.12" />
        </filter>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="card-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="100%" stopColor="#ede9fe" />
        </linearGradient>
        <linearGradient id="card-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#ddd6fe" />
        </linearGradient>
        <linearGradient id="avatar-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="node-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>

      {/* Background subtle circle */}
      <circle cx="180" cy="150" r="120" fill="#f5f3ff" opacity="0.5" />

      {/* Connecting dotted lines */}
      <line x1="105" y1="90" x2="230" y2="70" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
      <line x1="105" y1="90" x2="195" y2="210" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3" />
      <line x1="230" y1="70" x2="195" y2="210" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.35" />
      <line x1="230" y1="70" x2="310" y2="140" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.25" />
      <line x1="195" y1="210" x2="90" y2="220" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.2" />

      {/* Expert Card 1 — Top left */}
      <g filter="url(#card-shadow)">
        <rect x="40" y="40" width="130" height="100" rx="14" fill="url(#card-grad-1)" />
        <circle cx="80" cy="75" r="18" fill="url(#avatar-grad)" />
        <text x="80" y="80" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">AI</text>
        <rect x="108" y="62" width="48" height="8" rx="4" fill="#ddd6fe" />
        <rect x="108" y="76" width="36" height="6" rx="3" fill="#ede9fe" />
        <rect x="52" y="108" width="60" height="6" rx="3" fill="#ddd6fe" />
        <rect x="52" y="120" width="80" height="6" rx="3" fill="#ede9fe" />
        {/* AI badge */}
        <rect x="130" y="44" width="32" height="16" rx="8" fill="#6366f1" />
        <text x="146" y="55" textAnchor="middle" fill="white" fontSize="8" fontWeight="600">AI</text>
      </g>

      {/* Expert Card 2 — Top right */}
      <g filter="url(#card-shadow)">
        <rect x="195" y="22" width="130" height="100" rx="14" fill="url(#card-grad-2)" />
        <circle cx="235" cy="57" r="18" fill="url(#avatar-grad)" />
        <text x="235" y="62" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">JD</text>
        <rect x="263" y="44" width="48" height="8" rx="4" fill="#ddd6fe" />
        <rect x="263" y="58" width="36" height="6" rx="3" fill="#ede9fe" />
        <rect x="207" y="90" width="70" height="6" rx="3" fill="#ddd6fe" />
        <rect x="207" y="102" width="50" height="6" rx="3" fill="#ede9fe" />
        {/* Verified badge */}
        <circle cx="251" cy="45" r="6" fill="#6366f1" />
        <path d="M248.5 45 L250 46.5 L253.5 43" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Expert Card 3 — Bottom center */}
      <g filter="url(#card-shadow)">
        <rect x="130" y="168" width="130" height="100" rx="14" fill="url(#card-grad-1)" />
        <circle cx="170" cy="203" r="18" fill="url(#avatar-grad)" />
        <text x="170" y="208" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">MK</text>
        <rect x="198" y="190" width="48" height="8" rx="4" fill="#ddd6fe" />
        <rect x="198" y="204" width="36" height="6" rx="3" fill="#ede9fe" />
        <rect x="142" y="236" width="55" height="6" rx="3" fill="#ddd6fe" />
        <rect x="142" y="248" width="75" height="6" rx="3" fill="#ede9fe" />
        {/* AI badge */}
        <rect x="222" y="172" width="32" height="16" rx="8" fill="#8b5cf6" />
        <text x="238" y="183" textAnchor="middle" fill="white" fontSize="8" fontWeight="600">AI</text>
      </g>

      {/* Knowledge nodes */}
      <circle cx="310" cy="140" r="10" fill="url(#node-grad)" opacity="0.7" />
      <circle cx="310" cy="140" r="5" fill="white" opacity="0.8" />

      <circle cx="90" cy="220" r="8" fill="url(#node-grad)" opacity="0.5" />
      <circle cx="90" cy="220" r="4" fill="white" opacity="0.7" />

      <circle cx="320" cy="230" r="6" fill="#8b5cf6" opacity="0.4" />
      <circle cx="320" cy="230" r="3" fill="white" opacity="0.6" />

      <circle cx="45" cy="175" r="5" fill="#6366f1" opacity="0.35" />

      {/* Sparkles */}
      <g fill="#6366f1" opacity="0.6">
        <path d="M290 30 L292 36 L298 38 L292 40 L290 46 L288 40 L282 38 L288 36 Z" />
      </g>
      <g fill="#8b5cf6" opacity="0.5">
        <path d="M50 260 L51.5 264 L55.5 265.5 L51.5 267 L50 271 L48.5 267 L44.5 265.5 L48.5 264 Z" />
      </g>
      <g fill="#6366f1" opacity="0.45">
        <path d="M340 80 L341 83 L344 84 L341 85 L340 88 L339 85 L336 84 L339 83 Z" />
      </g>
      <g fill="#8b5cf6" opacity="0.55">
        <path d="M20 110 L21.5 114 L25.5 115.5 L21.5 117 L20 121 L18.5 117 L14.5 115.5 L18.5 114 Z" />
      </g>
      <g fill="#6366f1" opacity="0.35">
        <path d="M270 260 L271 263 L274 264 L271 265 L270 268 L269 265 L266 264 L269 263 Z" />
      </g>
    </svg>
  );
}

export function HubHero({ className }: HubHeroProps) {
  return (
    <section className={`relative overflow-hidden rounded-2xl ${className ?? ""}`}>
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative flex flex-col items-center px-4 py-12 lg:flex-row lg:items-center lg:gap-8 lg:px-10 lg:py-16">
        {/* Left column — text content */}
        <div className="flex flex-col items-center text-center lg:flex-1 lg:items-start lg:text-left">
          <h1 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Discover Experts &amp;{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Knowledge
            </span>
          </h1>

          <div className="mt-8 w-full max-w-xl">
            <SearchBar placeholder="Search experts, topics, knowledge..." />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Popular:</span>
            {["AI", "Finance", "Health", "Technology", "Marketing"].map(
              (topic) => (
                <a
                  key={topic}
                  href={`/hub/topics/${topic.toLowerCase()}`}
                  className="rounded-full border border-border/50 bg-background/50 px-2.5 py-1 transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {topic}
                </a>
              )
            )}
          </div>
        </div>

        {/* Right column — SVG illustration (hidden on mobile) */}
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
          <div className="w-full max-w-[400px]">
            <ExpertIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}
