"use client";

import { BookOpen, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { MessageSource } from "./chat-message";

interface SourceCitationProps {
  sources: MessageSource[];
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (sources.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="sources" className="border-0">
        <AccordionTrigger className="py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" />
            {sources.length} source{sources.length !== 1 && "s"}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2 pt-1">
            {sources.map((source, i) => (
              <div
                key={i}
                className="rounded-md border border-border/50 bg-background p-2.5 transition-colors hover:border-border"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-tight">
                      {source.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                      {source.snippet}
                    </p>
                  </div>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
