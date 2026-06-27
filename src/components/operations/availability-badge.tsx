import { cn } from "@/lib/utils";
import type { ProviderAvailability } from "@/services/performance-engine.service";

const STYLES: Record<ProviderAvailability, string> = {
  ONLINE: "bg-[#22C55E]/15 text-[#16a34a] border-[#22C55E]/30",
  OFFLINE: "bg-muted text-muted-foreground border-border",
  BUSY: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  ON_LEAVE: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  SUSPENDED: "bg-red-500/15 text-red-600 border-red-500/30",
};

export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: ProviderAvailability;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        STYLES[availability],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          availability === "ONLINE" && "bg-[#22C55E] animate-pulse",
          availability === "BUSY" && "bg-amber-500",
          availability === "OFFLINE" && "bg-muted-foreground",
          availability === "ON_LEAVE" && "bg-blue-500",
          availability === "SUSPENDED" && "bg-red-500"
        )}
      />
      {availability.replace(/_/g, " ")}
    </span>
  );
}
