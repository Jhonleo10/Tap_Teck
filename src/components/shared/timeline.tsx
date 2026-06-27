"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  icon: LucideIcon;
  accent?: "teal" | "green" | "amber" | "blue";
}

const dotColors = {
  teal: "bg-[#006F5F]",
  green: "bg-[#22C55E]",
  amber: "bg-amber-500",
  blue: "bg-[#0E8A72]",
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[1.35rem] top-3 bottom-3 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />
      {items.map((item, i) => {
        const Icon = item.icon;
        const accent = item.accent ?? "teal";
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            <div
              className={cn(
                "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm",
                "ring-4 ring-background"
              )}
            >
              <div className={cn("absolute -left-px top-1/2 h-2 w-2 -translate-y-1/2 rounded-full", dotColors[accent])} />
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="font-medium leading-snug">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
              )}
              <p className="mt-1.5 text-xs text-muted-foreground/80">
                {formatDateTime(item.timestamp)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
