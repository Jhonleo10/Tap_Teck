"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { cn } from "@/lib/utils";
import type { TrendCard as TrendCardType, PredictionItem } from "@/lib/ai/types";

export function TrendCard({ trend, index = 0 }: { trend: TrendCardType; index?: number }) {
  const Icon =
    trend.trend === "up" ? TrendingUp : trend.trend === "down" ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
    >
      <GlassCard hover className="border border-border/60 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {trend.title}
          </p>
          <Icon
            className={cn(
              "h-4 w-4",
              trend.trend === "up" && "text-[#22C55E]",
              trend.trend === "down" && "text-red-500",
              trend.trend === "stable" && "text-muted-foreground"
            )}
          />
        </div>
        <p className="mt-2 text-2xl font-bold text-primary">{trend.value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{trend.description}</p>
        {trend.changePercent !== undefined && (
          <p
            className={cn(
              "mt-2 text-xs font-semibold",
              trend.changePercent > 0 ? "text-[#22C55E]" : trend.changePercent < 0 ? "text-red-500" : ""
            )}
          >
            {trend.changePercent > 0 ? "+" : ""}
            {trend.changePercent}% change
          </p>
        )}
      </GlassCard>
    </motion.div>
  );
}

export function PredictionCard({
  prediction,
  index = 0,
}: {
  prediction: PredictionItem;
  index?: number;
}) {
  const confidenceColor =
    prediction.confidence >= 80
      ? "text-[#22C55E]"
      : prediction.confidence >= 60
        ? "text-amber-600"
        : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard className="border-dashed border-primary/25 p-4">
        <p className="text-sm font-semibold">{prediction.title}</p>
        <p className="mt-1 text-xl font-bold text-primary">{prediction.value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{prediction.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${prediction.confidence}%` }}
            />
          </div>
          <span className={cn("text-xs font-bold", confidenceColor)}>
            {prediction.confidence}%
          </span>
        </div>
      </GlassCard>
    </motion.div>
  );
}
