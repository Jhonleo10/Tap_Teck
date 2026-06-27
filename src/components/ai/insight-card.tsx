"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { cn } from "@/lib/utils";
import type { AIInsight } from "@/lib/ai/types";

const CATEGORY_COLORS: Record<string, string> = {
  REVENUE: "border-[#22C55E]/30 bg-[#22C55E]/5",
  BOOKINGS: "border-primary/30 bg-primary/5",
  GROWTH: "border-blue-500/30 bg-blue-500/5",
  OPERATIONS: "border-amber-500/30 bg-amber-500/5",
  REFERRAL: "border-purple-500/30 bg-purple-500/5",
  SATISFACTION: "border-amber-400/30 bg-amber-400/5",
  TREND: "border-teal-500/30 bg-teal-500/5",
  PROVIDER: "border-[#006F5F]/30 bg-[#006F5F]/5",
  CUSTOMER: "border-indigo-500/30 bg-indigo-500/5",
};

export function InsightCard({ insight, index = 0 }: { insight: AIInsight; index?: number }) {
  const TrendIcon =
    insight.trend === "up" ? TrendingUp : insight.trend === "down" ? TrendingDown : Minus;

  const content = (
    <GlassCard
      hover
      className={cn(
        "flex flex-col gap-2 border p-4 transition-all",
        CATEGORY_COLORS[insight.category] ?? "border-border/60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {insight.category}
        </span>
        {insight.trend && (
          <TrendIcon
            className={cn(
              "h-4 w-4",
              insight.trend === "up" && "text-[#22C55E]",
              insight.trend === "down" && "text-red-500",
              insight.trend === "stable" && "text-muted-foreground"
            )}
          />
        )}
      </div>
      <p className="font-semibold leading-snug">{insight.title}</p>
      <p className="text-sm text-muted-foreground line-clamp-2">{insight.description}</p>
      {insight.metric && (
        <p className="text-sm font-bold text-primary">{insight.metric}</p>
      )}
      {insight.href && (
        <span className="mt-auto flex items-center gap-1 text-xs font-medium text-primary">
          View details <ArrowRight className="h-3 w-3" />
        </span>
      )}
    </GlassCard>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      {insight.href ? <Link href={insight.href}>{content}</Link> : content}
    </motion.div>
  );
}
