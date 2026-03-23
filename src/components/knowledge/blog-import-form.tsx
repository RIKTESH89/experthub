"use client";

import { useState } from "react";
import { Globe, Plus, X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ImportResult {
  url: string;
  status: "success" | "error";
  title?: string;
  error?: string;
}

export function BlogImportForm() {
  const [urlInput, setUrlInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);

  function addUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    try {
      new URL(trimmed);
    } catch {
      return;
    }

    if (!urls.includes(trimmed)) {
      setUrls((prev) => [...prev, trimmed]);
    }
    setUrlInput("");
  }

  function addBulkUrls() {
    const newUrls = bulkInput
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => {
        try {
          new URL(u);
          return true;
        } catch {
          return false;
        }
      })
      .filter((u) => !urls.includes(u));

    setUrls((prev) => [...prev, ...newUrls]);
    setBulkInput("");
  }

  function removeUrl(url: string) {
    setUrls((prev) => prev.filter((u) => u !== url));
  }

  async function handleImport() {
    if (urls.length === 0) return;

    setIsImporting(true);
    setResults([]);

    try {
      const res = await fetch("/api/knowledge/import/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }

      const data: ImportResult[] = await res.json();
      setResults(data);

      // Remove successfully imported URLs
      const successUrls = new Set(data.filter((r) => r.status === "success").map((r) => r.url));
      setUrls((prev) => prev.filter((u) => !successUrls.has(u)));
    } catch (error) {
      setResults(
        urls.map((url) => ({
          url,
          status: "error" as const,
          error: error instanceof Error ? error.message : "Unknown error",
        }))
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Import from Blog URLs
        </CardTitle>
        <CardDescription>
          Paste blog article URLs to import their content into your knowledge base.
          Up to 20 URLs per import.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Single URL input */}
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/article"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            disabled={isImporting}
          />
          <Button
            variant="outline"
            onClick={addUrl}
            disabled={isImporting || !urlInput.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Bulk URL input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Paste multiple URLs (one per line)..."
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            rows={3}
            disabled={isImporting}
          />
          {bulkInput.trim() && (
            <Button variant="secondary" size="sm" onClick={addBulkUrls}>
              Add URLs from text
            </Button>
          )}
        </div>

        {/* URL list */}
        {urls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              URLs to import ({urls.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {urls.map((url) => (
                <Badge key={url} variant="secondary" className="max-w-full">
                  <span className="truncate max-w-[300px]">{url}</span>
                  <button
                    onClick={() => removeUrl(url)}
                    className="ml-1 hover:text-destructive"
                    disabled={isImporting}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Import button */}
        <Button
          onClick={handleImport}
          disabled={isImporting || urls.length === 0}
          className="w-full"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            `Import ${urls.length} URL${urls.length !== 1 ? "s" : ""}`
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Results</p>
            {results.map((result, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                  result.status === "success"
                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                    : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                }`}
              >
                {result.status === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {result.title || result.url}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {result.url}
                  </p>
                  {result.error && (
                    <p className="mt-1 text-xs text-red-600">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
