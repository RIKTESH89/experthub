"use client";

import { motion } from "motion/react";

function FloatingPill({
  className,
  gradient,
  delay,
  duration,
  yRange,
  xRange,
}: {
  className: string;
  gradient: string;
  delay: number;
  duration: number;
  yRange: [number, number, number];
  xRange: [number, number, number];
}) {
  return (
    <motion.div
      className={`absolute rounded-full opacity-20 blur-[1px] ${className}`}
      style={{ background: gradient }}
      animate={{
        y: yRange,
        x: xRange,
        rotate: [0, 8, -8, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    />
  );
}

export function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top banner */}
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="md:hidden px-6 py-5"
        style={{
          background:
            "linear-gradient(160deg, #050D1E 0%, #0B1A3E 30%, #1E40AF 70%, #2563EB 100%)",
        }}
      >
        <div className="flex items-center gap-2.5 text-white">
          <svg
            viewBox="0 0 32 32"
            className="h-7 w-7 shrink-0"
            aria-hidden="true"
          >
            <rect
              width="32"
              height="32"
              rx="6"
              fill="rgba(255,255,255,0.15)"
            />
            <rect x="8" y="8" width="2.5" height="16" rx="1" fill="white" />
            <rect x="12" y="8" width="12" height="2" rx="1" fill="white" />
            <rect x="12" y="14" width="8" height="2" rx="1" fill="white" />
            <rect x="12" y="22" width="12" height="2" rx="1" fill="white" />
          </svg>
          <span className="text-lg font-semibold tracking-tight">
            ExpertHub
          </span>
        </div>
        <p className="text-blue-200 text-xs mt-1 font-medium tracking-wide uppercase">
          Connect with Expert Digital Twins
        </p>
      </motion.div>

      {/* Left illustration panel - desktop only */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-[45%] relative overflow-hidden flex-col items-center justify-center p-12"
        style={{
          background:
            "linear-gradient(160deg, #050D1E 0%, #0B1A3E 30%, #1E40AF 70%, #2563EB 100%)",
        }}
      >
        {/* Luminous glow orbs */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-30 blur-[80px]"
          style={{ background: "radial-gradient(circle, #2563EB 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[80px]"
          style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)" }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Floating ElegantShape pills */}
        <FloatingPill
          className="w-28 h-10 top-[12%] left-[8%]"
          gradient="linear-gradient(135deg, #3B82F6 0%, #10B981 100%)"
          delay={0}
          duration={14}
          yRange={[0, -20, 0]}
          xRange={[0, 12, 0]}
        />
        <FloatingPill
          className="w-20 h-8 top-[22%] right-[12%]"
          gradient="linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)"
          delay={2}
          duration={16}
          yRange={[0, 18, 0]}
          xRange={[0, -10, 0]}
        />
        <FloatingPill
          className="w-24 h-9 bottom-[18%] left-[14%]"
          gradient="linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)"
          delay={4}
          duration={18}
          yRange={[0, -14, 0]}
          xRange={[0, 8, 0]}
        />
        <FloatingPill
          className="w-16 h-7 bottom-[30%] right-[8%]"
          gradient="linear-gradient(135deg, #10B981 0%, #3B82F6 100%)"
          delay={1}
          duration={12}
          yRange={[0, 16, 0]}
          xRange={[0, -14, 0]}
        />
        <FloatingPill
          className="w-14 h-6 top-[55%] left-[5%]"
          gradient="linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)"
          delay={3}
          duration={20}
          yRange={[0, -10, 0]}
          xRange={[0, 6, 0]}
        />

        {/* Logo with blur-fade entrance */}
        <motion.div
          initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="relative z-10 flex items-center gap-3 mb-12"
        >
          <svg
            viewBox="0 0 32 32"
            className="h-10 w-10 shrink-0"
            aria-hidden="true"
          >
            <rect
              width="32"
              height="32"
              rx="6"
              fill="rgba(255,255,255,0.15)"
            />
            <rect x="8" y="8" width="2.5" height="16" rx="1" fill="white" />
            <rect x="12" y="8" width="12" height="2" rx="1" fill="white" />
            <rect x="12" y="14" width="8" height="2" rx="1" fill="white" />
            <rect x="12" y="22" width="12" height="2" rx="1" fill="white" />
          </svg>
          <span className="text-2xl font-bold tracking-tight text-white">
            ExpertHub
          </span>
        </motion.div>

        {/* Network illustration SVG */}
        <motion.div
          initial={{ y: 24, opacity: 0, filter: "blur(6px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="relative z-10 w-full max-w-xs mb-12"
        >
          <svg
            viewBox="0 0 320 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
          >
            {/* Central node */}
            <circle
              cx="160"
              cy="130"
              r="36"
              fill="rgba(255,255,255,0.08)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
            />
            <circle
              cx="160"
              cy="130"
              r="20"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
            <rect
              x="154"
              y="124"
              width="12"
              height="12"
              rx="2"
              fill="rgba(255,255,255,0.7)"
            />

            {/* Top left node */}
            <circle
              cx="60"
              cy="50"
              r="24"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
            />
            <circle cx="60" cy="44" r="6" fill="rgba(255,255,255,0.5)" />
            <path
              d="M50 62c0-5.5 4.5-10 10-10s10 4.5 10 10"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
              fill="none"
            />

            {/* Top right node */}
            <circle
              cx="260"
              cy="50"
              r="24"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
            />
            <circle cx="260" cy="44" r="6" fill="rgba(255,255,255,0.5)" />
            <path
              d="M250 62c0-5.5 4.5-10 10-10s10 4.5 10 10"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
              fill="none"
            />

            {/* Bottom left node */}
            <circle
              cx="60"
              cy="210"
              r="24"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
            />
            <circle cx="60" cy="204" r="6" fill="rgba(255,255,255,0.5)" />
            <path
              d="M50 222c0-5.5 4.5-10 10-10s10 4.5 10 10"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
              fill="none"
            />

            {/* Bottom right node */}
            <circle
              cx="260"
              cy="210"
              r="24"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
            />
            <circle cx="260" cy="204" r="6" fill="rgba(255,255,255,0.5)" />
            <path
              d="M250 222c0-5.5 4.5-10 10-10s10 4.5 10 10"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
              fill="none"
            />

            {/* Connection lines */}
            <line
              x1="82"
              y1="64"
              x2="128"
              y2="110"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <line
              x1="238"
              y1="64"
              x2="192"
              y2="110"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <line
              x1="82"
              y1="196"
              x2="128"
              y2="150"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
            <line
              x1="238"
              y1="196"
              x2="192"
              y2="150"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />

            {/* Animated data dots traveling along lines */}
            <circle r="3" fill="#3B82F6">
              <animateMotion
                dur="4s"
                repeatCount="indefinite"
                path="M82,64 L128,110"
              />
              <animate
                attributeName="opacity"
                values="0;0.9;0.9;0"
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="3" fill="#10B981">
              <animateMotion
                dur="4s"
                repeatCount="indefinite"
                begin="1s"
                path="M238,64 L192,110"
              />
              <animate
                attributeName="opacity"
                values="0;0.9;0.9;0"
                dur="4s"
                begin="1s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="3" fill="#6366F1">
              <animateMotion
                dur="4s"
                repeatCount="indefinite"
                begin="2s"
                path="M82,196 L128,150"
              />
              <animate
                attributeName="opacity"
                values="0;0.9;0.9;0"
                dur="4s"
                begin="2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="3" fill="#3B82F6">
              <animateMotion
                dur="4s"
                repeatCount="indefinite"
                begin="3s"
                path="M238,196 L192,150"
              />
              <animate
                attributeName="opacity"
                values="0;0.9;0.9;0"
                dur="4s"
                begin="3s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Static glow dots at midpoints */}
            <circle cx="105" cy="87" r="2.5" fill="rgba(255,255,255,0.5)">
              <animate
                attributeName="opacity"
                values="0.2;0.7;0.2"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="215" cy="87" r="2.5" fill="rgba(255,255,255,0.5)">
              <animate
                attributeName="opacity"
                values="0.2;0.7;0.2"
                dur="3s"
                begin="0.75s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="105" cy="173" r="2.5" fill="rgba(255,255,255,0.5)">
              <animate
                attributeName="opacity"
                values="0.2;0.7;0.2"
                dur="3s"
                begin="1.5s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="215" cy="173" r="2.5" fill="rgba(255,255,255,0.5)">
              <animate
                attributeName="opacity"
                values="0.2;0.7;0.2"
                dur="3s"
                begin="2.25s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </motion.div>

        {/* Tagline with blur-fade entrance */}
        <motion.div
          initial={{ y: 16, opacity: 0, filter: "blur(6px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
          className="relative z-10 text-center"
        >
          <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
            Connect with Expert Digital Twins
          </h2>
          <p className="text-blue-200/80 text-sm max-w-xs mx-auto leading-relaxed">
            Access AI-powered knowledge from industry experts, available 24/7
          </p>
        </motion.div>
      </div>

      {/* Right side - clean white auth form area */}
      <div className="flex-1 flex items-center justify-center relative px-6 py-10 md:py-0 bg-white">
        <div className="relative z-10 w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
