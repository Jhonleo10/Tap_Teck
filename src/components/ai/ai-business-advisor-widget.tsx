"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { InsightCard } from "@/components/ai/insight-card";
import { fetchAdvisorPreview } from "@/actions/ai";
import { useOperationsPoll } from "@/hooks/use-operations-poll";

export function AIBusinessAdvisorWidget({ countryCode }: { countryCode: string }) {
  const fetcher = useCallback(() => fetchAdvisorPreview(countryCode), [countryCode]);
  const { data, isPending } = useOperationsPoll({
    fetcher,
    intervalMs: 180_000,
    enabled: !!countryCode,
    deferMs: 0,
  });

  return (
    <GlassCard className="border-primary/15 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#006F5F] to-[#22C55E]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-semibold">TapTeck AI Business Advisor</p>
            <p className="text-xs text-muted-foreground">Rule-based intelligence · zero API cost</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl gap-1" asChild>
          <Link href="/ai">
            Full AI Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {isPending && !data ? (
        <LoadingSpinner className="py-8" text="Analyzing marketplace data..." />
      ) : data ? (
        data.advisorInsights.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Monitoring active — insights appear as marketplace data grows.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.advisorInsights.slice(0, 6).map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        )
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No insights available yet.
        </p>
      )}
    </GlassCard>
  );
}
