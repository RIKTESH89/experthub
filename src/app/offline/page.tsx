"use client";

import styles from "@/components/public-studio/reading.module.css";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className={`${styles.page} ${styles.state}`}>
      <div className="mx-auto max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
          You&apos;re Offline
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          It looks like you&apos;ve lost your internet connection. Check your
          network and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
