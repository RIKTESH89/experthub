"use client";

import { useState } from "react";
import { isPreviewIsolated } from "@/lib/preview-isolation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

export default function LoginPage() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      toast.error("Failed to sign in with Google");
      setIsGoogleLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, filter: "blur(8px)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
    >
      {/* Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 overflow-hidden">
        {/* Animated gradient top border */}
        <div
          className="h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, #2563EB, #10B981, #2563EB)",
            backgroundSize: "200% 100%",
            animation: "gradientShift 4s ease-in-out infinite",
          }}
        />
        <style>{`
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>

        {/* Header */}
        <div className="px-10 pt-10 pb-2 text-center space-y-3">
          <motion.h1
            initial={{ y: 10, opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="text-2xl font-bold tracking-tight text-slate-900"
          >
            Welcome to ExpertHub
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="text-slate-500 text-sm leading-relaxed"
          >
            Sign in with your Google account to continue
          </motion.p>
        </div>

        {/* Content */}
        <div className="px-10 pb-10 pt-6 space-y-6">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isPreviewIsolated()}
              className="w-full flex items-center justify-center gap-3 h-12 px-5 rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-[1px] text-slate-700 font-medium text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:hover:shadow-sm disabled:hover:translate-y-0 cursor-pointer"
            >
              <div className="relative h-5 w-5 shrink-0">
                <motion.div
                  animate={{ opacity: isGoogleLoading ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </motion.div>
                <motion.div
                  animate={{ opacity: isGoogleLoading ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </motion.div>
              </div>
              <span>{isPreviewIsolated() ? "Google sign-in disabled in Preview" : "Continue with Google"}</span>
            </button>
          </motion.div>

          {/* Secured by Google */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.55 }}
            className="flex items-center justify-center gap-1.5 text-slate-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Secured by Google</span>
          </motion.div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Helper text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="text-center text-xs text-slate-400 leading-relaxed tracking-wide"
          >
            New users are automatically registered as subscribers.
            <br />
            Want to become an expert?{" "}
            <a
              href="/#apply-expert"
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors hover:underline underline-offset-2"
            >
              Apply here
            </a>
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
