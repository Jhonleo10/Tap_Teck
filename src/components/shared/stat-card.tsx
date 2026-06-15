"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  delay?: number;
  accent?: "teal" | "emerald" | "amber" | "blue" | "rose" | "orange";
}

const accentStyles = {
  teal: { icon: "from-teal-500/20 to-teal-600/5 text-teal-600 dark:text-teal-400", dot: "bg-teal-500" },
  emerald: { icon: "from-emerald-500/20 to-emerald-600/5 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  amber: { icon: "from-amber-500/20 to-amber-600/5 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  blue: { icon: "from-blue-500/20 to-blue-600/5 text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  rose: { icon: "from-rose-500/20 to-rose-600/5 text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
  orange: { icon: "from-orange-500/20 to-orange-600/5 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  className,
  delay = 0,
  accent = "teal",
}: StatCardProps) {
  const styles = accentStyles[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.06, duration: 0.4 }}
    >
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
          className
        )}
      >
        <div className={cn("absolute left-0 top-0 h-1 w-full opacity-90", styles.dot)} />
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p className={cn("text-xs font-medium", trendUp ? "text-emerald-600" : "text-red-500")}>
                {trend}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br transition-transform group-hover:scale-105",
              styles.icon
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
