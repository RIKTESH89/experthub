"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeConfig = {
  sm: { container: "h-4 w-4", stroke: 2, radius: 6, text: "text-xs" },
  md: { container: "h-8 w-8", stroke: 2.5, radius: 14, text: "text-sm" },
  lg: { container: "h-12 w-12", stroke: 3, radius: 22, text: "text-base" },
};

export function LoadingSpinner({
  className,
  size = "md",
  text,
}: LoadingSpinnerProps) {
  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={cn("relative", config.container, className)}>
        {/* Background ring */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 48 48"
          fill="none"
        >
          <circle
            cx="24"
            cy="24"
            r={config.radius}
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-slate-200"
          />
        </svg>

        {/* Spinning arc */}
        <motion.svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 48 48"
          fill="none"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <circle
            cx="24"
            cy="24"
            r={config.radius}
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.35}
            className="text-blue-700 dark:text-blue-400"
          />
        </motion.svg>
      </div>

      {text && (
        <span
          className={cn(
            "font-medium font-sans text-muted-foreground",
            config.text,
          )}
        >
          {text}
        </span>
      )}
    </div>
  );
}
