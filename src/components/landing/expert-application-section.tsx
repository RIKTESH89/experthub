import { ExpertApplicationForm } from "./expert-application-form";

export function ExpertApplicationSection() {
  return (
    <section id="apply-expert" className="relative bg-muted/30 scroll-mt-16">
      <div className="hidden" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-primary to-primary" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Apply as an <span className="text-primary">Expert</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Share your knowledge with the world through your AI Digital Twin.
            Fill out the form below and we&apos;ll review your application.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-border/50 bg-card p-6 shadow-warm sm:p-8">
          <ExpertApplicationForm />
        </div>
      </div>
    </section>
  );
}
