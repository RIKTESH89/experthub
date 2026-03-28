"use client";

import { format } from "date-fns";
import { motion } from "motion/react";

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
      className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-r from-[#1E40AF]/[0.06] via-transparent to-[#1E40AF]/[0.03] p-5 sm:p-6"
    >
      {/* Subtle top-edge accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1E40AF]/20 to-transparent" />

      <div className="relative z-10">
        <motion.p
          className="text-xs font-medium tracking-wide text-slate-500 font-sans uppercase"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
        >
          {today}
        </motion.p>

        <motion.h1
          className="mt-1.5 text-lg font-bold tracking-tight font-sans sm:text-xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
        >
          Welcome back,{" "}
          <span className="text-[#1E40AF]">{userName}</span>
        </motion.h1>

        <motion.p
          className="mt-1 text-sm text-muted-foreground font-sans"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );
}
