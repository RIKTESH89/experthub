import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string }).role || "";
    if (role === "ADMIN") redirect("/admin");
    if (role === "EXPERT") redirect("/expert");
    redirect("/subscriber/feed");
  }
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top banner */}
      <div className="md:hidden bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-6">
        <div className="flex items-center gap-2 text-white">
          <svg viewBox="0 0 512 512" className="h-7 w-7 shrink-0 rounded-md" aria-hidden="true">
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
        </div>
        <p className="text-indigo-100 text-sm mt-1">
          Connect with Expert Digital Twins
        </p>
      </div>

      {/* Left illustration panel - hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-600 to-indigo-800 flex-col items-center justify-center p-12">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating circles */}
          <svg
            className="absolute top-10 left-10 opacity-10"
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
          >
            <circle cx="60" cy="60" r="60" fill="white" />
          </svg>
          <svg
            className="absolute bottom-20 right-10 opacity-10"
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
          >
            <circle cx="40" cy="40" r="40" fill="white" />
          </svg>
          <svg
            className="absolute top-1/3 right-20 opacity-5"
            width="200"
            height="200"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="100" cy="100" r="100" fill="white" />
          </svg>
          <svg
            className="absolute bottom-10 left-20 opacity-5"
            width="150"
            height="150"
            viewBox="0 0 150 150"
            fill="none"
          >
            <circle cx="75" cy="75" r="75" fill="white" />
          </svg>

          {/* Sparkle decorations */}
          <svg
            className="absolute top-20 right-16 opacity-20"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
          <svg
            className="absolute bottom-32 left-12 opacity-20"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
          <svg
            className="absolute top-1/2 left-8 opacity-15"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 mb-8">
          <svg viewBox="0 0 512 512" className="h-12 w-12 shrink-0 rounded-xl" aria-hidden="true">
            <rect width="512" height="512" rx="112" fill="rgba(255,255,255,0.15)"/>
            <rect x="140" y="128" width="36" height="256" rx="4" fill="white"/>
            <rect x="176" y="128" width="180" height="30" rx="4" fill="white"/>
            <rect x="176" y="225" width="120" height="30" rx="4" fill="white"/>
            <rect x="316" y="225" width="40" height="30" rx="4" fill="white" opacity="0.5"/>
            <rect x="176" y="354" width="180" height="30" rx="4" fill="white"/>
            <circle cx="378" cy="240" r="8" fill="white" opacity="0.3"/>
            <circle cx="400" cy="240" r="5" fill="white" opacity="0.15"/>
          </svg>
          <span className="text-3xl font-bold tracking-tight text-white">
            ExpertHub
          </span>
        </div>

        {/* Main illustration SVG */}
        <div className="relative z-10 w-full max-w-sm mb-8">
          <svg
            viewBox="0 0 400 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto drop-shadow-2xl"
          >
            {/* Central hub circle */}
            <circle cx="200" cy="160" r="50" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
            <circle cx="200" cy="160" r="35" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />

            {/* Central sparkle icon */}
            <path
              d="M200 135L204 152L220 155L204 158L200 175L196 158L180 155L196 152L200 135Z"
              fill="rgba(255,255,255,0.8)"
            />

            {/* Expert node - top left */}
            <circle cx="80" cy="70" r="30" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
            {/* Person icon */}
            <circle cx="80" cy="62" r="8" fill="rgba(255,255,255,0.6)" />
            <path d="M66 85C66 77 72 72 80 72C88 72 94 77 94 85" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" />

            {/* Expert node - top right */}
            <circle cx="320" cy="70" r="30" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
            <circle cx="320" cy="62" r="8" fill="rgba(255,255,255,0.6)" />
            <path d="M306 85C306 77 312 72 320 72C328 72 334 77 334 85" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" />

            {/* Expert node - bottom left */}
            <circle cx="80" cy="250" r="30" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
            <circle cx="80" cy="242" r="8" fill="rgba(255,255,255,0.6)" />
            <path d="M66 265C66 257 72 252 80 252C88 252 94 257 94 265" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" />

            {/* Expert node - bottom right */}
            <circle cx="320" cy="250" r="30" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
            <circle cx="320" cy="242" r="8" fill="rgba(255,255,255,0.6)" />
            <path d="M306 265C306 257 312 252 320 252C328 252 334 257 334 265" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" />

            {/* Connection lines from nodes to center */}
            <line x1="108" y1="85" x2="155" y2="135" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="6 4" />
            <line x1="292" y1="85" x2="245" y2="135" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="6 4" />
            <line x1="108" y1="235" x2="155" y2="185" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="6 4" />
            <line x1="292" y1="235" x2="245" y2="185" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="6 4" />

            {/* Small data dots along connection lines */}
            <circle cx="130" cy="110" r="3" fill="rgba(255,255,255,0.5)" />
            <circle cx="270" cy="110" r="3" fill="rgba(255,255,255,0.5)" />
            <circle cx="130" cy="210" r="3" fill="rgba(255,255,255,0.5)" />
            <circle cx="270" cy="210" r="3" fill="rgba(255,255,255,0.5)" />

            {/* Digital twin indicators - small sparkles near nodes */}
            <path d="M115 55L117 60L122 62L117 64L115 69L113 64L108 62L113 60L115 55Z" fill="rgba(255,255,255,0.4)" />
            <path d="M285 55L287 60L292 62L287 64L285 69L283 64L278 62L283 60L285 55Z" fill="rgba(255,255,255,0.4)" />
            <path d="M115 235L117 240L122 242L117 244L115 249L113 244L108 242L113 240L115 235Z" fill="rgba(255,255,255,0.4)" />
            <path d="M285 235L287 240L292 242L287 244L285 249L283 244L278 242L283 240L285 235Z" fill="rgba(255,255,255,0.4)" />

            {/* Outer ring pulse effect */}
            <circle cx="200" cy="160" r="90" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <circle cx="200" cy="160" r="130" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </svg>
        </div>

        {/* Tagline */}
        <div className="relative z-10 text-center">
          <h2 className="text-xl lg:text-2xl font-semibold text-white mb-2">
            Connect with Expert Digital Twins
          </h2>
          <p className="text-indigo-200 text-sm lg:text-base max-w-xs mx-auto">
            Access AI-powered knowledge from industry experts, available 24/7
          </p>
        </div>
      </div>

      {/* Right side - auth form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-8 md:py-0">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
