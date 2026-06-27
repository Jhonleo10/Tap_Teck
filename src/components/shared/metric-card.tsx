"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  delay?: number;
  accent?: "teal" | "emerald" | "amber" | "green" | "rose" | "blue" | "orange";
  href?: string;
  hint?: string;
  animate?: boolean;
}

const accentStyles = {
  teal: {
    icon: "from-[#006F5F]/20 to-[#006F5F]/5 text-[#006F5F]",
    bar: "from-[#006F5F] to-[#0E8A72]",
  },
  emerald: {
    icon: "from-emerald-500/20 to-emerald-600/5 text-emerald-600",
    bar: "from-emerald-500 to-emerald-400",
  },
  amber: {
    icon: "from-amber-500/20 to-amber-600/5 text-amber-600",
    bar: "from-amber-500 to-amber-400",
  },
  green: {
    icon: "from-[#22C55E]/20 to-[#22C55E]/5 text-[#22C55E]",
    bar: "from-[#22C55E] to-[#0E8A72]",
  },
  rose: {
    icon: "from-rose-500/20 to-rose-600/5 text-rose-600",
    bar: "from-rose-500 to-rose-400",
  },
  blue: {
    icon: "from-[#0E8A72]/20 to-[#0E8A72]/5 text-[#0E8A72]",
    bar: "from-[#0E8A72] to-[#14B8A6]",
  },
  orange: {
    icon: "from-orange-500/20 to-orange-600/5 text-orange-600",
    bar: "from-orange-500 to-orange-400",
  },
};

export function MetricCard({
  title,
  value,
  numericValue,
  icon: Icon,
  trend,
  trendUp,
  className,
  delay = 0,
  accent = "teal",
  href,
  hint = "View details",
  animate = true,
}: MetricCardProps) {
  const styles = accentStyles[accent];
  const counterTarget = typeof numericValue === "number" ? numericValue : typeof value === "number" ? value : 0;
  const shouldAnimate = animate && (typeof numericValue === "number" || typeof value === "number");
  const animated = useAnimatedCounter(counterTarget, 1000, shouldAnimate);
  const displayValue =
    shouldAnimate && typeof value === "number"
      ? animated
      : typeof numericValue === "number" && typeof value !== "number"
        ? animated
        : value;

  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all duration-300",
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/30 before:to-transparent",
        href && "cursor-pointer hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        className
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80", styles.bar)} />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{displayValue}</p>
          {trend && (
            <p className={cn("text-xs font-medium", trendUp ? "text-[#22C55E]" : "text-red-500")}>
              {trend}
            </p>
          )}
          {href && (
            <p className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              {hint}
              <ArrowUpRight className="h-3 w-3" />
            </p>
          )}
        </div>
        <motion.div
          whileHover={{ scale: 1.08, rotate: 3 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-inner",
            styles.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {href ? (
        <Link href={href} className="block rounded-2xl">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.div>
  );
}

/** @deprecated Use MetricCard — re-export for compatibility */
export { MetricCard as StatCard };
