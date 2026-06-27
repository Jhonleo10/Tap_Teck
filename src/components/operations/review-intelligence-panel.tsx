"use client";

import { useCallback } from "react";
import { AlertTriangle, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { GlassCard } from "@/components/shared/glass-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { fetchReviewIntelligence, flagReview, deleteReview } from "@/actions/operations";
import { useOperationsPoll } from "@/hooks/use-operations-poll";
import { toast } from "sonner";

export function ReviewIntelligencePanel({
  countryCode,
}: {
  countryCode: string;
}) {
  const fetcher = useCallback(
    () => fetchReviewIntelligence(countryCode),
    [countryCode]
  );

  const { data } = useOperationsPoll({
    fetcher,
    intervalMs: 120_000,
    enabled: !!countryCode,
  });

  if (!data) return null;

  const chartData = data.distribution.map((d) => ({
    rating: `${d.rating}★`,
    count: d.count,
  }));

  const handleFlag = async (message: string) => {
    toast.info(`Flagged pattern: ${message}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Avg Rating" value={`${data.averageRating}★`} icon={Star} accent="amber" />
        <StatCard title="Total Reviews" value={data.totalReviews} icon={Star} accent="teal" />
        <StatCard title="Positive (4–5★)" value={data.positiveCount} icon={ThumbsUp} accent="emerald" />
        <StatCard title="Negative (1–2★)" value={data.negativeCount} icon={ThumbsDown} accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Rating Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#006F5F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <GlassCard className="p-4">
          <p className="mb-3 text-sm font-semibold">Intelligence Flags</p>
          {data.flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No anomalies detected.</p>
          ) : (
            <ul className="space-y-2">
              {data.flags.slice(0, 6).map((flag, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      <span className="font-medium">{flag.type.replace(/_/g, " ")}</span>
                      <span className="block text-muted-foreground">{flag.message}</span>
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => handleFlag(flag.message)}
                  >
                    Flag
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard className="p-4">
          <p className="mb-2 text-sm font-semibold">Top Reviewed Providers</p>
          <ul className="space-y-1.5 text-sm">
            {data.topProviders.map((p) => (
              <li key={p.businessName} className="flex justify-between">
                <span>{p.businessName}</span>
                <span className="text-muted-foreground">
                  {p.avgRating.toFixed(1)}★ · {p.count}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="mb-2 text-sm font-semibold">Low Rated Providers</p>
          <ul className="space-y-1.5 text-sm">
            {data.lowRatedProviders.length === 0 ? (
              <li className="text-muted-foreground">None flagged</li>
            ) : (
              data.lowRatedProviders.map((p) => (
                <li key={p.businessName} className="flex justify-between">
                  <span>{p.businessName}</span>
                  <span className="text-red-600">
                    {p.avgRating.toFixed(1)}★ · {p.count}
                  </span>
                </li>
              ))
            )}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

export async function reviewAdminActions(
  reviewId: string,
  action: "flag" | "delete",
  onDone?: () => void
) {
  if (action === "flag") {
    const result = await flagReview(reviewId, "Admin flagged from review table");
    if (result.success) {
      toast.success("Review flagged");
      onDone?.();
    } else {
      toast.error(result.error ?? "Failed to flag");
    }
  } else {
    const result = await deleteReview(reviewId);
    if (result.success) {
      toast.success("Review deleted");
      onDone?.();
    } else {
      toast.error(result.error ?? "Failed to delete");
    }
  }
}
