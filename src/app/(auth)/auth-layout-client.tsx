"use client";

import { motion } from "motion/react";

export function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top banner */}
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="md:hidden px-6 py-5"
        style={{ background: "linear-gradient(135deg, #0F1D45 0%, #1E40AF 100%)" }}
      >
        <div className="flex items-center gap-2.5 text-white">
          <svg
            viewBox="0 0 32 32"
            className="h-7 w-7 shrink-0"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="6" fill="rgba(255,255,255,0.15)" />
            <rect x="8" y="8" width="2.5" height="16" rx="1" fill="white" />
            <rect x="12" y="8" width="12" height="2" rx="1" fill="white" />
            <rect x="12" y="14" width="8" height="2" rx="1" fill="white" />
            <rect x="12" y="22" width="12" height="2" rx="1" fill="white" />
          </svg>
          <span className="text-lg font-semibold tracking-tight">ExpertHub</span>
        </div>
        <p className="text-blue-200 text-xs mt-1 font-medium tracking-wide uppercase">
          Connect with Expert Digital Twins
        </p>
      </motion.div>

      {/* Left illustration panel - desktop only */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-[45%] relative overflow-hidden flex-col items-center justify-center p-12"
        style={{ background: "linear-gradient(160deg, #0B1A3E 0%, #1E40AF 60%, #2563EB 100%)" }}
      >
        {/* Subtle grid overlay - Swiss style */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Geometric shapes - clean, minimal */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          className="absolute top-16 left-16 w-24 h-24 border border-white/10 rounded-full"
        />
        <motion.div
          animate={{ rotate: [0, -360] }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-24 right-20 w-32 h-32 border border-white/8"
        />
        <motion.div
          animate={{ opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-12 w-16 h-16 bg-white rounded-full"
        />
        <motion.div
          animate={{ opacity: [0.04, 0.1, 0.04] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/3 left-10 w-20 h-20 bg-white"
        />

        {/* Logo */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative z-10 flex items-center gap-3 mb-12"
        >
          <svg
            viewBox="0 0 32 32"
            className="h-10 w-10 shrink-0"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="6" fill="rgba(255,255,255,0.15)" />
            <rect x="8" y="8" width="2.5" height="16" rx="1" fill="white" />
            <rect x="12" y="8" width="12" height="2" rx="1" fill="white" />
            <rect x="12" y="14" width="8" height="2" rx="1" fill="white" />
            <rect x="12" y="22" width="12" height="2" rx="1" fill="white" />
          </svg>
          <span className="text-2xl font-bold tracking-tight text-white">
            ExpertHub
          </span>
        </motion.div>

        {/* Clean geometric illustration */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 w-full max-w-xs mb-12"
        >
          <svg
            viewBox="0 0 320 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
          >
            {/* Central node */}
            <circle cx="160" cy="130" r="36" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            <circle cx="160" cy="130" r="20" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <rect x="154" y="124" width="12" height="12" rx="2" fill="rgba(255,255,255,0.7)" />

            {/* Top left node */}
            <circle cx="60" cy="50" r="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx="60" cy="44" r="6" fill="rgba(255,255,255,0.5)" />
            <path d="M50 62c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />

            {/* Top right node */}
            <circle cx="260" cy="50" r="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx="260" cy="44" r="6" fill="rgba(255,255,255,0.5)" />
            <path d="M250 62c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />

            {/* Bottom left node */}
            <circle cx="60" cy="210" r="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx="60" cy="204" r="6" fill="rgba(255,255,255,0.5)" />
            <path d="M50 222c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />

            {/* Bottom right node */}
            <circle cx="260" cy="210" r="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx="260" cy="204" r="6" fill="rgba(255,255,255,0.5)" />
            <path d="M250 222c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />

            {/* Connection lines */}
            <line x1="82" y1="64" x2="128" y2="110" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="238" y1="64" x2="192" y2="110" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="82" y1="196" x2="128" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="238" y1="196" x2="192" y2="150" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

            {/* Animated data dots */}
            <circle cx="105" cy="87" r="2.5" fill="rgba(255,255,255,0.5)">
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="215" cy="87" r="2.5" fill="rgba(255,255,255,0.5)">
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3s" begin="0.75s" repeatCount="indefinite" />
            </circle>
            <circle cx="105" cy="173" r="2.5" fill="rgba(255,255,255,0.5)">
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3s" begin="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="215" cy="173" r="2.5" fill="rgba(255,255,255,0.5)">
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3s" begin="2.25s" repeatCount="indefinite" />
            </circle>
          </svg>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
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
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative z-10 w-full max-w-sm"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
