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
                    {!!source.metadata?.temporalTrace && (() => {
                      const temporal = source.metadata.temporalTrace as Record<string, unknown>;
                      const stances = Array.isArray(temporal.stances) ? temporal.stances : [];
                      return <details className="mt-2 text-[11px] text-muted-foreground">
                        <summary className="cursor-pointer">Time and source context</summary>
                        <p>{String(temporal.mode || "current")} · {String(temporal.validAt || "unknown date")}</p>
                        <p>{String(temporal.coverage || "selected sources")}</p>
                        {stances.map((value, index) => {
                          const stance = value as Record<string, unknown>;
                          return <div key={index} className="mt-1 break-words">
                            <p>{String(stance.origin || "unknown origin")} · {String(stance.kind || "unknown")} · {String(stance.certainty || "unknown certainty")}</p>
                            <p>Valid from {String(stance.validFrom || "unknown")} until {String(stance.validUntil || "unknown")}</p>
                            <p>Revision {String(stance.revisionId || "unknown")} · span {String(stance.start ?? "?")}–{String(stance.end ?? "?")}</p>
                          </div>;
                        })}
                      </details>;
                    })()}
                    {Array.isArray(source.metadata?.evidenceTrace) && source.metadata.evidenceTrace.length > 0 && (
                      <details className="mt-2 text-[11px] text-muted-foreground">
                        <summary className="cursor-pointer">Evidence and attribution</summary>
                        {source.metadata.evidenceTrace.map((value, index) => {
                          const trace = value as Record<string, unknown>;
                          return <div key={index} className="mt-1 break-words">
                            <p>{String(trace.speakerRole || "unknown")} · {String(trace.kind || "unknown")} · {trace.endorsedByOwner === true ? "owner endorsed" : "no owner endorsement"}</p>
                            <p>Revision {String(trace.revisionId || "unknown")} · span {String(trace.start ?? "?")}–{String(trace.end ?? "?")}</p>
                            <blockquote>{String(trace.text || "")}</blockquote>
                          </div>;
                        })}
                      </details>
                    )}
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
