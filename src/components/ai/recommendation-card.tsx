"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AIRecommendation } from "@/lib/ai/types";

const PRIORITY_STYLES = {
  HIGH: "border-red-500/30 bg-red-500/5",
  MEDIUM: "border-amber-500/30 bg-amber-500/5",
  LOW: "border-primary/20 bg-primary/5",
};

export function RecommendationCard({
  recommendation,
  index = 0,
}: {
  recommendation: AIRecommendation;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard
        className={cn("flex gap-3 border p-4", PRIORITY_STYLES[recommendation.priority])}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{recommendation.title}</p>
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {recommendation.priority}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{recommendation.description}</p>
          <p className="mt-1 text-xs text-muted-foreground/80">{recommendation.rationale}</p>
          {recommendation.href && recommendation.actionLabel && (
            <Button size="sm" variant="outline" className="mt-3 h-8 rounded-lg gap-1" asChild>
              <Link href={recommendation.href}>
                {recommendation.actionLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
