"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { cn } from "@/lib/utils";
import type { AIAlert } from "@/lib/ai/types";

const SEVERITY = {
  CRITICAL: {
    icon: AlertTriangle,
    className: "border-red-500/40 bg-red-500/10 text-red-700",
    badge: "bg-red-500 text-white",
  },
  WARNING: {
    icon: AlertCircle,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-800",
    badge: "bg-amber-500 text-white",
  },
  INFO: {
    icon: Info,
    className: "border-blue-500/30 bg-blue-500/5 text-blue-800",
    badge: "bg-blue-500 text-white",
  },
};

export function AlertCard({ alert }: { alert: AIAlert }) {
  const cfg = SEVERITY[alert.severity];
  const Icon = cfg.icon;

  const inner = (
    <GlassCard className={cn("flex items-start gap-3 border p-4", cfg.className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{alert.title}</p>
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", cfg.badge)}>
            {alert.severity}
          </span>
        </div>
        <p className="mt-1 text-sm opacity-90">{alert.description}</p>
      </div>
    </GlassCard>
  );

  return alert.href ? <Link href={alert.href}>{inner}</Link> : inner;
}
