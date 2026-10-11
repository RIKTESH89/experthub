"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const pathname = usePathname();
  const homepageTheme = pathname === "/" ? "dark " : "";
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const installingRef = useRef(false);
  const installButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Keep homepage installation UI hidden without intercepting native browser installation.
    if (pathname === "/" || pathname?.startsWith("/embed/")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    try {
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;
    } catch { /* Storage restrictions do not block the page. */ }
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const handler = (event: Event) => {
      event.preventDefault();
      clearTimeout(timer);
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const timer = setTimeout(() => setShowBanner(true), 5000);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [pathname]);

  const handleInstall = useCallback(async () => {
    if (installingRef.current) return;
    if (!installPrompt) { setShowGuide(true); return; }
    installingRef.current = true;
    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      if ((await installPrompt.userChoice).outcome === "accepted") setShowBanner(false);
    } catch { setShowGuide(true); }
    finally {
      setInstallPrompt(null);
      installingRef.current = false;
      setIsInstalling(false);
    }
  }, [installPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setShowGuide(false);
    try { localStorage.setItem("pwa-install-dismissed", Date.now().toString()); } catch { /* Optional preference. */ }
  }, []);

  if (!showBanner || pathname === "/" || pathname?.startsWith("/embed/")) return null;

  return <>
    {/* Keep installation suggestions in document flow on eligible routes. */}
    <aside aria-label="Install ExpertHub" className={`${homepageTheme}${pathname === "/" ? "z-40 " : ""}relative mx-auto my-4 flex w-[calc(100%-2rem)] max-w-xl items-start gap-3 rounded-xl border border-border bg-card p-4 text-foreground`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true"><Smartphone size={20}/></span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Keep ExpertHub close</p>
        <p className="mt-1 text-sm text-muted-foreground">Add ExpertHub to your home screen. Installation options depend on your browser.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button ref={installButtonRef} className="min-h-11 gap-2" disabled={isInstalling} onClick={handleInstall}><Download size={16}/>{isInstalling ? "Opening installer…" : "Install App"}</Button>
          <Button variant="ghost" className="min-h-11" onClick={handleDismiss}>Not now</Button>
        </div>
      </div>
      <button type="button" aria-label="Dismiss install suggestion" onClick={handleDismiss} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18}/></button>
    </aside>
    <Dialog open={showGuide} onOpenChange={setShowGuide}>
      <DialogContent onCloseAutoFocus={event => { event.preventDefault(); installButtonRef.current?.focus(); }} className={`${homepageTheme}max-h-[85svh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl text-foreground [&>button:last-child]:grid [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:place-items-center`}>
        <DialogTitle>{isIOS ? "Install on iOS" : "Install ExpertHub"}</DialogTitle>
        <DialogDescription>{isIOS ? "Use Safari’s Share menu to add ExpertHub to your home screen." : "Open your browser menu and look for Install app or Add to Home Screen. If neither option is available, your browser may not support installation."}</DialogDescription>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
          <li>{isIOS ? "Open the Share menu in Safari." : "Open your browser’s main menu."}</li>
          <li>{isIOS ? "Choose Add to Home Screen." : "Choose Install app or Add to Home Screen, if available."}</li>
          <li>Review and confirm the installation in your browser.</li>
        </ol>
        <Button className="min-h-11" onClick={() => setShowGuide(false)}>Got it</Button>
      </DialogContent>
    </Dialog>
  </>;
}
