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

const roleStats: Record<string, string[]> = {
  EXPERT: ["12 subscribers", "5 posts", "89% engagement"],
  SUBSCRIBER: ["3 subscriptions", "8 bookmarks", "2 chats"],
  ADMIN: ["150 users", "12 experts", "3 reports"],
};

export function WelcomeBanner({ userName, role }: WelcomeBannerProps) {
  const today = format(new Date(), "EEEE, MMMM d");
  const message = role ? roleMessages[role] : "Welcome back to your dashboard.";
  const stats = role ? roleStats[role] : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 p-5 md:p-6">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/4" />
      <div className="absolute top-0 right-1/4 h-32 w-32 rounded-full bg-primary/6 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

      {/* Content */}
      <div className="relative z-10">
        {/* Greeting + date on one line */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">
            Welcome back, <span className="text-gradient">{userName}</span>
          </h1>
          <span className="text-xs font-medium text-muted-foreground/70 tracking-wide">
            {today}
          </span>
        </div>

        {/* Role message */}
        <p className="mt-1 text-sm text-muted-foreground">
          {message}
        </p>

        {/* Quick stat pills */}
        {stats && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {stats.map((stat, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-primary/8 border border-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {stat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
