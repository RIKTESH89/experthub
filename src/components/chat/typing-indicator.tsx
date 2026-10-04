"use client";

import { motion, useReducedMotion } from "motion/react";

export function TypingIndicator() {
  const reduceMotion = useReducedMotion();
  return (
    <div role="status" className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-card px-5 py-3.5">
      <span className="sr-only">AI is typing</span>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-primary"
          animate={reduceMotion ? { y: 0, opacity: 1 } : {
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.2,
            repeat: reduceMotion ? 0 : Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}
