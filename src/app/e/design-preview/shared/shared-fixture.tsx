"use client";

import { useState } from "react";
import { PostFeed } from "@/components/posts/post-feed";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

export function SharedUiFixture() {
  const [saved, setSaved] = useState(false);
  return <main className="mx-auto max-w-2xl space-y-8 px-5 py-8">
    <p className="rounded-lg border bg-card p-4 text-sm">LOCAL UI FIXTURE · Synthetic form · No account, AI or billing operation. Feed request uses the local unauthenticated endpoint to review its error state.</p>
    <div className="flex items-center justify-between gap-4"><h1 className="text-3xl font-medium">Shared interaction review</h1><ThemeToggle /></div>
    <Button variant="outline" onClick={() => {localStorage.removeItem("pwa-install-dismissed"); window.location.reload();}}>Reset local install suggestion</Button>
    <form onSubmit={event => {event.preventDefault(); setSaved(true);}} className="space-y-4 rounded-xl border bg-card p-5">
      <label className="block space-y-2"><span>Synthetic display name</span><input className="min-h-11 w-full rounded-lg border bg-background px-3 text-base" defaultValue="Alex (fixture)" /></label>
      <p className="text-sm text-muted-foreground">This form changes only local fixture state.</p>
      <Button type="submit" className="min-h-11">Save fixture</Button>
      {saved && <p role="status">Fixture saved locally.</p>}
    </form>
    <section aria-label="Post loading recovery"><PostFeed /></section>
  </main>;
}
