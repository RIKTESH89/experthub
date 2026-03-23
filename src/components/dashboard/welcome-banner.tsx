import { format } from "date-fns";

interface WelcomeBannerProps {
  userName: string;
  role?: string;
}

const roleMessages: Record<string, string> = {
  ADMIN: "Monitor and manage your platform.",
  EXPERT: "Share expertise, grow your audience.",
  SUBSCRIBER: "Discover insights from top experts.",
};

function ExpertIllustration() {
  return (
    <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" aria-hidden="true">
      {/* Background soft shape */}
      <ellipse cx="140" cy="100" rx="120" ry="70" fill="#f5f3ff" />
      {/* Person / Expert avatar */}
      <circle cx="60" cy="80" r="22" fill="#ede9fe" stroke="#6366f1" strokeWidth="2" />
      <circle cx="60" cy="72" r="8" fill="#6366f1" />
      <path d="M44 96c0-8.8 7.2-16 16-16s16 7.2 16 16" fill="#6366f1" opacity="0.3" />
      {/* Document / Book */}
      <rect x="42" y="110" width="36" height="28" rx="3" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.5" />
      <line x1="50" y1="118" x2="70" y2="118" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="50" y1="124" x2="66" y2="124" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="50" y1="130" x2="62" y2="130" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      {/* Broadcast / Signal waves from expert */}
      <path d="M92 72c6-4 6-20 0-24" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M100 68c8-6 8-28 0-34" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />
      <path d="M108 64c10-8 10-36 0-44" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.2" />
      {/* AI Avatar / Digital Twin (center) */}
      <rect x="120" y="55" width="40" height="50" rx="8" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
      <circle cx="140" cy="72" r="7" fill="#8b5cf6" />
      <path d="M130 92c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="#8b5cf6" opacity="0.4" />
      {/* AI sparkle on twin */}
      <path d="M152 56l3-6 3 6-6 3 6 3-3 6-3-6-6-3z" fill="#6366f1" opacity="0.6" />
      {/* Connection lines to subscribers */}
      <line x1="160" y1="75" x2="190" y2="60" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
      <line x1="160" y1="80" x2="190" y2="85" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
      <line x1="160" y1="90" x2="190" y2="110" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
      {/* Subscriber nodes */}
      <circle cx="200" cy="55" r="12" fill="#ede9fe" stroke="#6366f1" strokeWidth="1.5" />
      <circle cx="200" cy="52" r="4" fill="#6366f1" />
      <path d="M194 62c0-3.3 2.7-6 6-6s6 3.3 6 6" fill="#6366f1" opacity="0.3" />
      <circle cx="206" cy="85" r="12" fill="#ede9fe" stroke="#6366f1" strokeWidth="1.5" />
      <circle cx="206" cy="82" r="4" fill="#6366f1" />
      <path d="M200 92c0-3.3 2.7-6 6-6s6 3.3 6 6" fill="#6366f1" opacity="0.3" />
      <circle cx="200" cy="115" r="12" fill="#ede9fe" stroke="#6366f1" strokeWidth="1.5" />
      <circle cx="200" cy="112" r="4" fill="#6366f1" />
      <path d="M194 122c0-3.3 2.7-6 6-6s6 3.3 6 6" fill="#6366f1" opacity="0.3" />
      {/* Small decorative dots */}
      <circle cx="235" cy="60" r="3" fill="#ddd6fe" />
      <circle cx="245" cy="90" r="2" fill="#ddd6fe" />
      <circle cx="230" cy="120" r="2.5" fill="#ddd6fe" />
    </svg>
  );
}

function SubscriberIllustration() {
  return (
    <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" aria-hidden="true">
      {/* Background soft shape */}
      <ellipse cx="140" cy="100" rx="120" ry="70" fill="#f5f3ff" />
      {/* User / Subscriber avatar */}
      <circle cx="60" cy="85" r="20" fill="#ede9fe" stroke="#6366f1" strokeWidth="2" />
      <circle cx="60" cy="78" r="7" fill="#6366f1" />
      <path d="M46 98c0-7.7 6.3-14 14-14s14 7.7 14 98" fill="#6366f1" opacity="0.3" />
      {/* Connection line to knowledge hub */}
      <line x1="80" y1="85" x2="115" y2="85" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 3" opacity="0.5" />
      {/* Knowledge graph / hub (center) */}
      <circle cx="140" cy="75" r="18" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
      {/* Lightbulb inside hub */}
      <path d="M134 70c0-3.3 2.7-6 6-6s6 2.7 6 6c0 2-1 3.5-2.5 4.5v3.5h-7v-3.5c-1.5-1-2.5-2.5-2.5-4.5z" fill="#8b5cf6" opacity="0.7" />
      <rect x="137" y="79" width="6" height="2" rx="1" fill="#8b5cf6" opacity="0.5" />
      {/* Radiating knowledge nodes */}
      <line x1="155" y1="65" x2="180" y2="48" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
      <circle cx="185" cy="44" r="10" fill="#ddd6fe" stroke="#6366f1" strokeWidth="1.5" />
      <line x1="158" y1="75" x2="185" y2="75" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
      <circle cx="190" cy="75" r="8" fill="#ddd6fe" stroke="#6366f1" strokeWidth="1.5" />
      <line x1="155" y1="85" x2="180" y2="105" stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
      <circle cx="185" cy="110" r="10" fill="#ddd6fe" stroke="#6366f1" strokeWidth="1.5" />
      {/* Chat bubbles */}
      <rect x="200" cy="35" y="32" width="44" height="28" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
      <line x1="208" y1="42" x2="236" y2="42" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="208" y1="48" x2="228" y2="48" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M210 60l-6 8 12 0z" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="205" y="80" width="38" height="24" rx="6" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="1.5" />
      <line x1="212" y1="89" x2="236" y2="89" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="212" y1="95" x2="230" y2="95" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      {/* Sparkles */}
      <path d="M170 38l2-4 2 4-4 2 4 2-2 4-2-4-4-2z" fill="#6366f1" opacity="0.4" />
      <path d="M100 55l1.5-3 1.5 3-3 1.5 3 1.5-1.5 3-1.5-3-3-1.5z" fill="#8b5cf6" opacity="0.3" />
      {/* Small decorative dots */}
      <circle cx="250" cy="70" r="2.5" fill="#ddd6fe" />
      <circle cx="255" cy="110" r="2" fill="#ddd6fe" />
    </svg>
  );
}

function AdminIllustration() {
  return (
    <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" aria-hidden="true">
      {/* Background soft shape */}
      <ellipse cx="140" cy="100" rx="120" ry="70" fill="#f5f3ff" />
      {/* Dashboard panel */}
      <rect x="30" y="40" width="100" height="70" rx="6" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
      {/* Chart bars */}
      <rect x="42" y="80" width="12" height="20" rx="2" fill="#8b5cf6" opacity="0.5" />
      <rect x="58" y="68" width="12" height="32" rx="2" fill="#6366f1" opacity="0.7" />
      <rect x="74" y="74" width="12" height="26" rx="2" fill="#8b5cf6" opacity="0.5" />
      <rect x="90" y="60" width="12" height="40" rx="2" fill="#6366f1" opacity="0.8" />
      <rect x="106" y="70" width="12" height="30" rx="2" fill="#8b5cf6" opacity="0.6" />
      {/* Chart title lines */}
      <line x1="42" y1="50" x2="80" y2="50" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="56" x2="65" y2="56" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Settings gear */}
      <circle cx="170" cy="55" r="16" fill="#ddd6fe" stroke="#6366f1" strokeWidth="2" />
      <circle cx="170" cy="55" r="6" fill="none" stroke="#6366f1" strokeWidth="2" />
      {/* Gear teeth */}
      <rect x="167" y="36" width="6" height="8" rx="1" fill="#6366f1" opacity="0.6" />
      <rect x="167" y="68" width="6" height="8" rx="1" fill="#6366f1" opacity="0.6" />
      <rect x="151" y="52" width="8" height="6" rx="1" fill="#6366f1" opacity="0.6" />
      <rect x="181" y="52" width="8" height="6" rx="1" fill="#6366f1" opacity="0.6" />
      <rect x="155" y="40" width="7" height="6" rx="1" fill="#6366f1" opacity="0.5" transform="rotate(-45 158.5 43)" />
      <rect x="178" y="63" width="7" height="6" rx="1" fill="#6366f1" opacity="0.5" transform="rotate(-45 181.5 66)" />
      <rect x="178" y="40" width="7" height="6" rx="1" fill="#6366f1" opacity="0.5" transform="rotate(45 181.5 43)" />
      <rect x="155" y="63" width="7" height="6" rx="1" fill="#6366f1" opacity="0.5" transform="rotate(45 158.5 66)" />
      {/* Monitoring / Activity line chart */}
      <rect x="145" y="85" width="80" height="50" rx="5" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
      <polyline points="155,118 165,108 175,114 185,100 195,106 205,95 215,102" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Activity dots on line */}
      <circle cx="185" cy="100" r="2.5" fill="#6366f1" />
      <circle cx="205" cy="95" r="2.5" fill="#6366f1" />
      {/* Status indicators */}
      <circle cx="235" cy="48" r="5" fill="#6366f1" opacity="0.3" />
      <circle cx="235" cy="48" r="2.5" fill="#6366f1" />
      <circle cx="235" cy="65" r="5" fill="#8b5cf6" opacity="0.3" />
      <circle cx="235" cy="65" r="2.5" fill="#8b5cf6" />
      {/* Small decorative dots */}
      <circle cx="50" cy="130" r="3" fill="#ddd6fe" />
      <circle cx="240" cy="110" r="2.5" fill="#ddd6fe" />
      <circle cx="120" cy="145" r="2" fill="#ddd6fe" />
    </svg>
  );
}

const roleIllustrations: Record<string, () => JSX.Element> = {
  ADMIN: AdminIllustration,
  EXPERT: ExpertIllustration,
  SUBSCRIBER: SubscriberIllustration,
};

export function WelcomeBanner({ userName, role }: WelcomeBannerProps) {
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  const message = role ? roleMessages[role] : "Welcome back to your dashboard.";
  const Illustration = role ? roleIllustrations[role] : null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/60 p-8 md:p-10">
      <div className="relative z-10 flex items-center justify-between gap-8">
        {/* Text section */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground/80 tracking-wide uppercase">{today}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Welcome back, <span className="text-gradient">{userName}</span>!
          </h1>
          <p className="mt-3 max-w-lg text-base text-muted-foreground">
            {message}
          </p>
        </div>
        {/* Illustration section */}
        {Illustration && (
          <div className="hidden md:block w-[280px] flex-shrink-0">
            <Illustration />
          </div>
        )}
      </div>

      {/* Subtle background decorative circles */}
      <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-4 right-16 h-32 w-32 rounded-full bg-primary/10 blur-xl" />
    </div>
  );
}
