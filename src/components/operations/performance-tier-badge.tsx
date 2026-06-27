import { cn } from "@/lib/utils";
import type { PerformanceTier } from "@/services/performance-engine.service";
import { tierLabel } from "@/services/performance-engine.service";

const TIER_STYLES: Record<PerformanceTier, string> = {
  ELITE: "bg-gradient-to-r from-[#006F5F] to-[#22C55E] text-white",
  EXCELLENT: "bg-[#0E8A72]/15 text-[#006F5F] border border-[#0E8A72]/30",
  GOOD: "bg-primary/10 text-primary border border-primary/20",
  NEEDS_IMPROVEMENT: "bg-amber-500/15 text-amber-700 border border-amber-500/30",
  POOR: "bg-red-500/15 text-red-600 border border-red-500/30",
};

export function PerformanceTierBadge({
  tier,
  score,
  className,
}: {
  tier: PerformanceTier;
  score?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TIER_STYLES[tier],
        className
      )}
    >
      {tierLabel(tier)}
      {score !== undefined && <span className="opacity-80">· {score}</span>}
    </span>
  );
}
