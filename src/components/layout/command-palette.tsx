"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  Briefcase,
  CalendarCheck,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  Gift,
  Settings,
  BarChart3,
  Bell,
  ScrollText,
  Command,
  Sparkles,
} from "lucide-react";
import { globalSearch, type SearchResultItem } from "@/actions/search";
import { aiNaturalLanguageSearch } from "@/actions/ai";
import { useCountry } from "@/components/providers/country-provider";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<SearchResultItem["type"], typeof Users> = {
  user: Users,
  provider: Briefcase,
  booking: CalendarCheck,
  page: LayoutDashboard,
};

const QUICK_PAGES = [
  { label: "Operations Center", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Intelligence", href: "/ai", icon: Sparkles },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Providers", href: "/providers", icon: Briefcase },
  { label: "Users", href: "/users", icon: Users },
  { label: "Bookings", href: "/bookings", icon: CalendarCheck },
  { label: "Verification", href: "/verification", icon: ShieldCheck },
  { label: "Referrals", href: "/referrals", icon: Gift },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Audit Logs", href: "/audit-logs", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface CommandPaletteProps {
  className?: string;
  variant?: "inline" | "trigger";
}

export function CommandPalette({ className, variant = "inline" }: CommandPaletteProps) {
  const router = useRouter();
  const { countryCode, country } = useCountry();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [aiResults, setAiResults] = useState<
    { label: string; description: string; href: string }[]
  >([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    (value: string) => {
      if (value.trim().length < 2) {
        setResults([]);
        setAiResults([]);
        return;
      }
      startTransition(async () => {
        const [items, aiRes] = await Promise.all([
          globalSearch(value, countryCode),
          aiNaturalLanguageSearch(value),
        ]);
        setResults(items);
        setAiResults(aiRes.success && aiRes.data ? aiRes.data : []);
        setActiveIndex(0);
      });
    },
    [countryCode]
  );

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 220);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setAiResults([]);
    router.push(href);
  };

  const filteredPages = query.trim()
    ? QUICK_PAGES.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_PAGES.slice(0, 6);

  const displayItems: Array<
    | (SearchResultItem & { kind: "result" })
    | (typeof QUICK_PAGES[number] & { kind: "page" })
    | ({ kind: "ai"; label: string; description: string; href: string })
  > = [
    ...aiResults.map((r) => ({ kind: "ai" as const, ...r })),
    ...results.map((r) => ({ kind: "result" as const, ...r })),
    ...(query.length < 2 ? filteredPages.map((p) => ({ kind: "page" as const, ...p })) : []),
  ];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, displayItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && displayItems[activeIndex]) {
      e.preventDefault();
      const item = displayItems[activeIndex];
      navigate(item.href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <>
      {variant === "trigger" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/25 px-3 text-sm text-muted-foreground transition hover:border-primary/25 hover:bg-background",
            className
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="min-w-0 flex-1 truncate text-left text-xs sm:text-sm">Search…</span>
          <kbd className="hidden shrink-0 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium lg:inline">
            ⌘K
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
            className
          )}
          aria-label="Open search"
        >
          <Search className="h-[17px] w-[17px]" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-1/2 top-[12vh] z-[101] w-[min(100%-2rem,36rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-2xl"
              role="dialog"
              aria-label="Command palette"
            >
              <div className="flex items-center gap-3 border-b border-border/50 px-4">
                <Command className="h-4 w-4 text-primary" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={`Search ${country.name} — users, providers, bookings…`}
                  className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <kbd className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  esc
                </kbd>
              </div>

              <div className="max-h-[min(50vh,24rem)] overflow-y-auto p-2">
                {displayItems.length === 0 && query.length >= 2 && !isPending ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {aiResults.length > 0 && (
                      <li className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        AI Assistant
                      </li>
                    )}
                    {aiResults.map((item, i) => (
                      <li key={`ai-${item.href}-${i}`}>
                        <button
                          type="button"
                          onClick={() => navigate(item.href)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                            activeIndex === i ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                          )}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22C55E]/10">
                            <Sparkles className="h-4 w-4 text-[#006F5F]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{item.label}</p>
                            <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                    {results.length > 0 && (
                      <li className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Results
                      </li>
                    )}
                    {results.map((item, i) => {
                      const Icon = TYPE_ICONS[item.type];
                      const idx = aiResults.length + i;
                      return (
                        <li key={`${item.type}-${item.id}`}>
                          <button
                            type="button"
                            onClick={() => navigate(item.href)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                              activeIndex === idx ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                            )}
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{item.title}</p>
                              {item.subtitle && (
                                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                              )}
                            </div>
                            <span className="text-[10px] uppercase text-muted-foreground">{item.type}</span>
                          </button>
                        </li>
                      );
                    })}
                    {query.length < 2 && (
                      <>
                        <li className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Quick navigation
                        </li>
                        {filteredPages.map((page, i) => {
                          const idx = aiResults.length + results.length + i;
                          const Icon = page.icon;
                          return (
                            <li key={page.href}>
                              <button
                                type="button"
                                onClick={() => navigate(page.href)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                                  activeIndex === idx ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                                )}
                              >
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{page.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </>
                    )}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/** @deprecated alias */
export const GlobalSearch = CommandPalette;
