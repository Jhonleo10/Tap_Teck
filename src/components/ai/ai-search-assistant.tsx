"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/shared/glass-card";
import { aiNaturalLanguageSearch } from "@/actions/ai";
import Link from "next/link";
import type { AISearchResult } from "@/lib/ai/types";

export function AISearchAssistant({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AISearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const runSearch = (value: string) => {
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const res = await aiNaturalLanguageSearch(value);
      if (res.success && res.data) setResults(res.data);
    });
  };

  useEffect(() => {
    if (initialQuery.trim().length >= 3) {
      runSearch(initialQuery);
    }
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GlassCard className="border-primary/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="font-semibold">AI Search Assistant</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          Rule-based · LLM-ready
        </span>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            runSearch(e.target.value);
          }}
          placeholder='Try "today&apos;s bookings" or "pending verification"'
          className="h-11 rounded-xl pl-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {results.length > 0 && (
        <ul className="mt-3 space-y-1">
          {results.map((r) => (
            <li key={r.href + r.label}>
              <Link
                href={r.href}
                className="flex flex-col rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Examples: top providers this month · highest revenue city · most cancelled services
      </p>
    </GlassCard>
  );
}
