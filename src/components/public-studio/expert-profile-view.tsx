"use client";

import styles from "@/components/public-studio/reading.module.css";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  Users,
  FileText,
  BadgeCheck,
  ExternalLink,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";

interface ExpertPublicProfile {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  headline: string | null;
  displayName: string;
  specialty: string[];
  socialLinks: { twitter?: string; linkedin?: string; website?: string } | null;
  monthlyPrice: number;
  isVerified: boolean;
  subscriberCount: number;
  postCount: number;
  twinGreeting: string | null;
}

export function PublicExpertProfileView({ expert }: { expert: ExpertPublicProfile }) {
  return (
    <div className={`${styles.page} ${styles.profile}`}>
      {/* Nav bar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">ExpertHub</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Profile content */}
      <main className="mx-auto max-w-2xl px-4 py-10">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
            <AvatarImage src={expert.image ?? undefined} alt={expert.displayName} />
            <AvatarFallback className="text-2xl font-bold">
              {getInitials(expert.displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="mt-4 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{expert.displayName}</h1>
            {expert.isVerified && (
              <BadgeCheck className="h-5 w-5 text-primary" />
            )}
          </div>

          {expert.headline && (
            <p className="mt-1 text-muted-foreground">{expert.headline}</p>
          )}

          {/* Stats */}
          <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {expert.subscriberCount} subscribers
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              {expert.postCount} posts
            </span>
          </div>

          {/* Specialties */}
          {expert.specialty.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {expert.specialty.map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* CTA Card — Chat with Twin */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
          <div className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <Bot className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Chat with my AI Digital Twin</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {expert.twinGreeting || `Explore ${expert.specialty[0] || "this expert’s knowledge"} with an AI representation grounded in expert-provided content.`}
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" asChild>
                <Link href={`/register?ref=expert&id=${expert.id}`}>
                  <MessageSquare className="h-4 w-4" />
                  Start Chatting Free
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                Free trial available · Then ₹{expert.monthlyPrice.toFixed(2)}/mo
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {expert.bio && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {expert.bio}
            </p>
          </div>
        )}

        {/* Social Links */}
        {expert.socialLinks && (expert.socialLinks.twitter || expert.socialLinks.linkedin || expert.socialLinks.website) && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Connect</h3>
            <div className="mt-2 flex flex-wrap gap-3">
              {expert.socialLinks.twitter && (
                <a href={expert.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted">
                  Twitter / X <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {expert.socialLinks.linkedin && (
                <a href={expert.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted">
                  LinkedIn <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {expert.socialLinks.website && (
                <a href={expert.socialLinks.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted">
                  Website <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Subscribe CTA */}
        <div className="mt-10 rounded-xl border border-border/50 bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Subscribe to access {expert.displayName}&apos;s Digital Twin, posts, and expert insights.
          </p>
          <Button className="mt-4 gap-2" asChild>
            <Link href={`/register?ref=expert&id=${expert.id}`}>
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <footer className="mt-12 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
          <p>Powered by <Link href="/" className="font-medium text-foreground hover:text-primary">ExpertHub</Link></p>
        </footer>
      </main>
    </div>
  );
}
