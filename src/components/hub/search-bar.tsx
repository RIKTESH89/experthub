"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Hash, Loader2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SearchResult {
  experts: Array<{
    id: string;
    displayName: string;
    headline?: string | null;
    image?: string | null;
  }>;
  topics: Array<{
    name: string;
    postCount: number;
  }>;
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

export function SearchBar({
  className,
  placeholder = "Search experts, topics...",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const hasResults =
    results && ((results.experts?.length ?? 0) > 0 || (results.topics?.length ?? 0) > 0);

  return (
    <div className={cn("relative w-full", className)}>
      <Command
        className="overflow-visible rounded-lg border border-border bg-card shadow-sm"
        shouldFilter={false}
      >
        <div className="flex items-center px-3">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <input
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          />
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </div>

        {isOpen && query.length >= 2 && (
          <CommandList className="absolute top-full z-50 mt-1 w-full max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
            {!hasResults && !isLoading && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {results?.experts && results.experts.length > 0 && (
              <CommandGroup heading="Experts">
                {results.experts.map((expert) => (
                  <CommandItem
                    key={expert.id}
                    value={expert.displayName}
                    onSelect={() => {
                      router.push(`/subscriber/experts/${expert.id}`);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={expert.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(expert.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {expert.displayName}
                      </p>
                      {expert.headline && (
                        <p className="truncate text-xs text-muted-foreground">
                          {expert.headline}
                        </p>
                      )}
                    </div>
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results?.experts &&
              results.experts.length > 0 &&
              results?.topics &&
              results.topics.length > 0 && <CommandSeparator />}

            {results?.topics && results.topics.length > 0 && (
              <CommandGroup heading="Topics">
                {results.topics.map((topic) => (
                  <CommandItem
                    key={topic.name}
                    value={topic.name}
                    onSelect={() => {
                      router.push(`/hub/topics/${topic.name}`);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        #{topic.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {topic.postCount} posts
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
