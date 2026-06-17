"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Briefcase,
  CalendarCheck,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { globalSearch, type SearchResultItem } from "@/actions/search";
import { useCountry } from "@/components/providers/country-provider";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  user: Users,
  provider: Briefcase,
  booking: CalendarCheck,
  page: LayoutDashboard,
};

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const { countryCode, country } = useCountry();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    (value: string) => {
      if (value.trim().length < 2) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const items = await globalSearch(value, countryCode);
        setResults(items);
      });
    },
    [countryCode]
  );

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 280);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) {
      navigate(results[0].href);
    } else if (query.trim()) {
      navigate(`/bookings?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-md", className)}>
      <form onSubmit={onSubmit}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={`Search ${country.name}… (Ctrl+K)`}
          className="h-10 w-full rounded-xl border border-border/60 bg-muted/40 pl-10 pr-16 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/20"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </form>

      {open && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg">
          {isPending ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto p-1.5">
              {results.map((item) => {
                const Icon = TYPE_ICONS[item.type];
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => navigate(item.href)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.title}</p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {item.type}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : query.length >= 2 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
