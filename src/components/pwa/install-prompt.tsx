"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return; // 7 days
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isiOS);

    if (isiOS) {
      // iOS doesn't fire beforeinstallprompt, show manual guide after delay
      const timer = setTimeout(() => setShowBanner(true), 5000);
      return () => clearTimeout(timer);
    }

    // Android/desktop: listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) {
      if (isIOS) {
        setShowIOSGuide(true);
        return;
      }
      return;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setInstallPrompt(null);
  }, [installPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  }, []);

  if (!showBanner) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up border-t border-border bg-card/95 px-4 py-3 shadow-warm-lg backdrop-blur-xl sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm sm:rounded-xl sm:border">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Install ExpertHub</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add to your home screen for a faster, app-like experience
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-xs hover:opacity-90"
                onClick={handleInstall}
              >
                <Download className="h-3.5 w-3.5" />
                Install App
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={handleDismiss}
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* iOS Manual Install Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm animate-slide-up rounded-t-2xl bg-card p-6 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Install on iOS</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  1
                </span>
                <p className="text-sm text-muted-foreground">
                  Tap the{" "}
                  <span className="font-medium text-foreground">Share</span>{" "}
                  button in Safari&apos;s toolbar
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  2
                </span>
                <p className="text-sm text-muted-foreground">
                  Scroll down and tap{" "}
                  <span className="font-medium text-foreground">
                    &quot;Add to Home Screen&quot;
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  3
                </span>
                <p className="text-sm text-muted-foreground">
                  Tap{" "}
                  <span className="font-medium text-foreground">
                    &quot;Add&quot;
                  </span>{" "}
                  to install ExpertHub
                </p>
              </div>
            </div>
            <Button
              className="mt-6 w-full rounded-xl"
              onClick={() => setShowIOSGuide(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
