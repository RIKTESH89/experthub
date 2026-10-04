"use client";

import styles from "@/components/public-studio/reading.module.css";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={`${styles.page} ${styles.state}`}>
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          Something went wrong
        </h1>

        <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
          An unexpected error occurred. Please try again or return to the home page.
        </p>

        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground transition-all hover:shadow-xl hover:brightness-110"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-8 text-sm font-medium transition-all hover:bg-muted"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
