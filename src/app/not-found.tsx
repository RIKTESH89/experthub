import styles from "@/components/public-studio/reading.module.css";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className={`${styles.page} ${styles.state}`}>
      <div className="text-center">
        <Link href="/" className="mb-8 inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">ExpertHub</span>
        </Link>

        <h1 className="mt-6 text-gradient text-8xl font-bold tracking-tighter sm:text-9xl">
          404
        </h1>

        <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Page Not Found
        </h2>

        <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground transition-all hover:shadow-xl hover:brightness-110"
          >
            Go Home
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-8 text-sm font-medium transition-all hover:bg-muted"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
