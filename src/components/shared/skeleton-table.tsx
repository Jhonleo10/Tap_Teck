import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 8, columns = 5, className }: SkeletonTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/40 bg-card", className)}>
      <div className="flex gap-4 border-b border-border/40 bg-muted/30 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded-md" />
        ))}
      </div>
      <div className="divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1 rounded-md", c === 0 && "max-w-[4rem]")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
