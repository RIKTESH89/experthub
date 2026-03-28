"use client";

import { motion } from "motion/react";

export function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-muted/50 px-5 py-3.5">
      <span className="sr-only">AI is typing</span>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-2 w-2 rounded-full bg-blue-700"
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}
