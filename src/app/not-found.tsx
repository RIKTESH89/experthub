import styles from "@/components/public-studio/reading.module.css";
import Link from "next/link";
import { BrandLink } from "@/components/brand/wordmark";

export default function NotFound() {
  return (
    <div className={`${styles.page} ${styles.state}`}>
      <div className="text-center">
        <BrandLink className="mx-auto mb-8" />

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
