import { format } from "date-fns";

interface WelcomeBannerProps {
  userName: string;
  role?: string;
}

const roleMessages: Record<string, string> = {
  ADMIN: "Your platform at a glance.",
  EXPERT: "Grow your audience today.",
  SUBSCRIBER: "Explore new expert insights.",
};

export function WelcomeBanner({ userName, role }: WelcomeBannerProps) {
  const today = format(new Date(), "EEEE, MMMM d");
  const message = role ? roleMessages[role] : "Welcome back to your dashboard.";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 p-4 sm:p-5">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      <div className="absolute top-0 right-1/4 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

      {/* Decorative sparkles */}
      <svg className="pointer-events-none absolute right-3 top-3 h-8 w-8 text-primary/10 sm:right-5 sm:top-3 sm:h-12 sm:w-12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
      </svg>
      <svg className="pointer-events-none absolute right-14 bottom-2 h-5 w-5 text-primary/[0.07]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
      </svg>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-base font-bold tracking-tight sm:text-lg">
            Welcome back, <span className="text-gradient">{userName}</span>
          </h1>
          <span className="hidden text-xs font-medium text-muted-foreground/70 tracking-wide sm:inline">
            {today}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
