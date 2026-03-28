"use client";

import React, { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";

/* ===================================================================
   ANIMATED HERO — Adapted from Web3HeroAnimated + ElegantShape patterns
   Recolored for ExpertHub: Navy #1E40AF, Green #22C55E, Gold #CA8A04
   =================================================================== */

// Symmetric pillar heights (percent). Tall at edges, low at center.
const pillars = [92, 84, 78, 70, 62, 54, 46, 34, 18, 34, 46, 54, 62, 70, 78, 84, 92];

export function HeroAnimated({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-black text-white">
      {/* ================== BACKGROUND ================== */}
      {/* Luminous elliptical gradients — ExpertHub brand colors */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30"
        style={{
          backgroundImage: [
            // Main central dome/band — blue core
            "radial-gradient(80% 55% at 50% 52%, rgba(30,64,175,0.50) 0%, rgba(30,64,175,0.35) 22%, rgba(34,197,94,0.18) 38%, rgba(14,20,40,0.50) 55%, rgba(8,8,12,0.92) 75%, rgba(0,0,0,1) 88%)",
            // Warm sweep from top-left — gold accent
            "radial-gradient(85% 60% at 14% 0%, rgba(202,138,4,0.30) 0%, rgba(34,197,94,0.20) 30%, rgba(0,0,0,0.0) 64%)",
            // Cool rim on top-right — blue
            "radial-gradient(70% 50% at 86% 22%, rgba(30,64,175,0.35) 0%, rgba(0,0,0,0.0) 55%)",
            // Soft top vignette
            "linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0) 40%)",
          ].join(","),
          backgroundColor: "#000",
        }}
      />

      {/* Vignette corners */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(140%_120%_at_50%_0%,transparent_60%,rgba(0,0,0,0.85))]"
      />

      {/* Grid overlay: vertical columns + curved horizontal arcs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 mix-blend-screen opacity-20"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 96px)",
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 24px)",
            "repeating-radial-gradient(80% 55% at 50% 52%, rgba(255,255,255,0.06) 0 1px, transparent 1px 120px)",
          ].join(","),
          backgroundBlendMode: "screen",
        }}
      />

      {/* ================== CONTENT ================== */}
      <div className="relative z-10 w-full">
        {children}
      </div>

      {/* ================== FOREGROUND ================== */}
      {/* Center-bottom rectangular glow */}
      <div
        className="pointer-events-none absolute bottom-[128px] left-1/2 z-0 h-36 w-28 -translate-x-1/2 rounded-md bg-gradient-to-b from-white/60 via-blue-200/40 to-transparent"
        style={{ animation: "subtlePulse 6s ease-in-out infinite" }}
      />

      {/* Stepped pillars silhouette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[54vh]">
        {/* dark fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
        {/* bars */}
        <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-px px-[2px]">
          {pillars.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-black"
              style={{
                height: isMounted ? `${h}%` : "0%",
                transition: "height 1s ease-in-out",
                transitionDelay: `${Math.abs(i - Math.floor(pillars.length / 2)) * 60}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Inline keyframe for subtle pulse */}
      <style>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 0.8; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.03); }
        }
      `}</style>
    </section>
  );
}

/* ===== Hero text entrance with stagger + blur ===== */
export function HeroText({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
      animate={isMounted ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{
        duration: 0.8,
        delay: 0.3 + delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ===== Scroll-triggered section reveal with blur fade ===== */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const directionMap = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
    none: { y: 0, x: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directionMap[direction], filter: "blur(6px)" }}
      animate={
        isInView
          ? { opacity: 1, y: 0, x: 0, filter: "blur(0px)" }
          : { opacity: 0, ...directionMap[direction], filter: "blur(6px)" }
      }
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ===== Stagger children on scroll ===== */
export function ScrollStagger({
  children,
  className,
  staggerDelay = 0.1,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: staggerDelay, delayChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScrollStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ===== Animated gradient border ===== */
export function AnimatedGradientBorder({
  children,
  className,
  containerClassName,
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <div className={`relative rounded-2xl p-[2px] ${containerClassName ?? ""}`}>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#1E40AF] via-[#22C55E] to-[#1E40AF]"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ backgroundSize: "200% 200%" }}
      />
      <div className={`relative rounded-2xl bg-white ${className ?? ""}`}>
        {children}
      </div>
    </div>
  );
}

/* ===== Animated counter on scroll ===== */
export function ScrollCounter({
  value,
  className,
  prefix = "",
  suffix = "",
  duration = 2,
}: {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const startTime = performance.now();
    const durationMs = duration * 1000;
    let frame: number;
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

/* ===== Hover card effect ===== */
export function HoverCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div whileHover={{ y: -6, transition: { duration: 0.3, ease: "easeOut" } }} className={className}>
      {children}
    </motion.div>
  );
}

/* ===== Floating decorative element ===== */
export function FloatingDeco({
  children,
  className,
  amplitude = 12,
  duration = 6,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{ y: [-amplitude, amplitude, -amplitude], rotate: [-2, 2, -2] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ===== Glass navigation with scroll awareness ===== */
export function GlassNav({ children, className }: { children: ReactNode; className?: string }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      className={className}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      style={{
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "blur(12px)",
        borderBottomColor: scrolled ? "rgba(30, 64, 175, 0.1)" : "transparent",
      }}
    >
      {children}
    </motion.header>
  );
}
