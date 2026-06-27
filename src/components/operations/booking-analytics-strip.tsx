"use client";

import { useCallback } from "react";
import { TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { fetchBookingAnalytics } from "@/actions/operations";
import { useOperationsPoll } from "@/hooks/use-operations-poll";
import { formatCurrency } from "@/lib/utils";

export function BookingAnalyticsStrip({ countryCode }: { countryCode: string }) {
  const fetcher = useCallback(
    () => fetchBookingAnalytics(countryCode),
    [countryCode]
  );

  const { data: analytics, isPending } = useOperationsPoll({
    fetcher,
    intervalMs: 120_000,
    enabled: !!countryCode,
  });

  if (!analytics && isPending) return null;

  if (!analytics) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Avg Booking Value"
        value={formatCurrency(analytics.averageBookingValue)}
        icon={TrendingUp}
        accent="teal"
      />
      <StatCard
        title="Completion Rate"
        value={`${Math.round(analytics.completionRate * 100)}%`}
        icon={CheckCircle}
        accent="emerald"
      />
      <StatCard
        title="Cancellation Rate"
        value={`${Math.round(analytics.cancellationRate * 100)}%`}
        icon={XCircle}
        accent="amber"
      />
      <StatCard
        title="Avg Completion Time"
        value={`${analytics.avgCompletionHours}h`}
        icon={Clock}
        accent="blue"
      />
    </div>
  );
}
