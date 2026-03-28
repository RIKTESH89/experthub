"use client";

import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useRef, useEffect, useState, type ReactNode } from "react";

/* ===== Scroll-triggered fade-in section ===== */
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
      initial={{
        opacity: 0,
        ...directionMap[direction],
        filter: "blur(6px)",
      }}
      animate={
        isInView
          ? { opacity: 1, y: 0, x: 0, filter: "blur(0px)" }
          : { opacity: 0, ...directionMap[direction], filter: "blur(6px)" }
      }
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
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
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
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
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
        },
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
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ backgroundSize: "200% 200%" }}
      />
      <div className={`relative rounded-2xl bg-card ${className ?? ""}`}>
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
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ===== Hero text entrance with blur fade ===== */
export function HeroTextEntrance({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ===== Card hover effect ===== */
export function HoverCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{
        y: -6,
        transition: { duration: 0.3, ease: "easeOut" },
      }}
      className={className}
    >
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
      animate={{
        y: [-amplitude, amplitude, -amplitude],
        rotate: [-2, 2, -2],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ===== Glass navigation with scroll awareness ===== */
export function GlassNav({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
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
        borderBottomColor: scrolled
          ? "rgba(30, 64, 175, 0.1)"
          : "transparent",
      }}
    >
      {children}
    </motion.header>
  );
}

/* ===== ElegantShape - 21st.dev Shape Landing Hero pattern ===== */
export function ElegantShape({
  className,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-[#1E40AF]/[0.15]",
  delay = 0,
  duration = 14,
}: {
  className?: string;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const yParallax = useTransform(scrollYProgress, [0, 1], [-20, 20]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8, rotate: rotate - 15 }}
      animate={{ opacity: 1, scale: 1, rotate }}
      transition={{
        duration: 1.8,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      style={{ y: yParallax }}
      className={className}
    >
      <motion.div
        animate={{
          y: [-15, 15, -15],
          rotate: [rotate, rotate + 4, rotate],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ width, height }}
        className="relative"
      >
        {/* Main pill / capsule shape */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${gradient} to-transparent backdrop-blur-[2px] border border-white/[0.08]`}
        />
        {/* Inner glow */}
        <div className="absolute inset-[1px] rounded-full bg-gradient-to-b from-white/[0.06] to-transparent" />
      </motion.div>
    </motion.div>
  );
}

/* ===== HeroSection - client wrapper for the dark hero with shapes ===== */
export function HeroSection({ children }: { children: ReactNode }) {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#030303]">
      {/* Gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E40AF]/[0.08] via-transparent to-[#22C55E]/[0.04]" />

      {/* Elegant floating shapes */}
      <ElegantShape
        className="absolute -left-20 top-[10%] hidden lg:block"
        width={500}
        height={120}
        rotate={-12}
        gradient="from-[#1E40AF]/[0.12]"
        delay={0.2}
        duration={16}
      />
      <ElegantShape
        className="absolute right-[-5%] top-[15%] hidden lg:block"
        width={420}
        height={100}
        rotate={15}
        gradient="from-[#22C55E]/[0.10]"
        delay={0.5}
        duration={18}
      />
      <ElegantShape
        className="absolute left-[10%] bottom-[10%] hidden lg:block"
        width={350}
        height={90}
        rotate={-8}
        gradient="from-[#CA8A04]/[0.08]"
        delay={0.8}
        duration={14}
      />
      <ElegantShape
        className="absolute right-[5%] bottom-[20%] hidden md:block"
        width={280}
        height={70}
        rotate={20}
        gradient="from-[#1E40AF]/[0.10]"
        delay={1.1}
        duration={20}
      />
      <ElegantShape
        className="absolute left-[40%] top-[5%] hidden xl:block"
        width={200}
        height={55}
        rotate={-25}
        gradient="from-white/[0.04]"
        delay={1.4}
        duration={15}
      />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] opacity-50" />

      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </section>
  );
}
