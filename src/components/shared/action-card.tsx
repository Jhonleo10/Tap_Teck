"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  title: string;
  description?: string;
  count: number | string;
  icon: LucideIcon;
  href: string;
  accent?: "warning" | "info" | "success" | "danger";
  delay?: number;
}

const accents = {
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  info: "bg-primary/10 text-primary border-primary/20",
  success: "bg-[#22C55E]/10 text-[#16a34a] border-[#22C55E]/20",
  danger: "bg-red-500/10 text-red-600 border-red-500/20",
};

export function ActionCard({
  title,
  description,
  count,
  icon: Icon,
  href,
  accent = "info",
  delay = 0,
}: ActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.06, duration: 0.35 }}
    >
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300",
          "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          accents[accent]
        )}
      >
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-foreground">{title}</p>
            <span className="rounded-full bg-background/80 px-2.5 py-0.5 text-sm font-bold tabular-nums">
              {count}
            </span>
          </div>
          {description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
    </motion.div>
  );
}
