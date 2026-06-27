"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BusinessHealthScore } from "@/lib/ai/types";

const TIER_COLORS: Record<string, string> = {
  EXCELLENT: "text-[#22C55E]",
  GOOD: "text-[#0E8A72]",
  AVERAGE: "text-amber-600",
  NEEDS_ATTENTION: "text-orange-600",
  POOR: "text-red-600",
};

const TIER_GRADIENT: Record<string, string> = {
  EXCELLENT: "from-[#22C55E] to-[#006F5F]",
  GOOD: "from-[#0E8A72] to-[#22C55E]",
  AVERAGE: "from-amber-400 to-amber-600",
  NEEDS_ATTENTION: "from-orange-400 to-orange-600",
  POOR: "from-red-400 to-red-600",
};

export function HealthMeter({ health }: { health: BusinessHealthScore }) {
  const pct = health.score;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Business Health Score</p>
          <p className={cn("text-4xl font-bold tabular-nums", TIER_COLORS[health.tier])}>
            {health.score}
            <span className="text-lg text-muted-foreground">/100</span>
          </p>
          <p className={cn("mt-1 text-sm font-semibold uppercase tracking-wide", TIER_COLORS[health.tier])}>
            {health.tier.replace(/_/g, " ")}
          </p>
        </div>
        <div className="relative h-4 w-full max-w-md overflow-hidden rounded-full bg-muted">
          <motion.div
            className={cn("h-full rounded-full bg-gradient-to-r", TIER_GRADIENT[health.tier])}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {health.metrics.map((m) => (
          <div
            key={m.key}
            className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2.5 text-sm"
          >
            <span className="text-muted-foreground">{m.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{m.value}</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                {m.score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
