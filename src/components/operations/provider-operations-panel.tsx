"use client";

import { useEffect, useState, useTransition } from "react";
import { Activity, IndianRupee, Users } from "lucide-react";
import { fetchProviderOperations } from "@/actions/operations";
import { DetailGrid, DetailItem } from "@/components/shared/detail-modal";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ErrorCard } from "@/components/shared/error-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { formatCurrency } from "@/lib/utils";
import { AvailabilityBadge } from "@/components/operations/availability-badge";
import { PerformanceTierBadge } from "@/components/operations/performance-tier-badge";
import type { ProviderOperationsProfile } from "@/services/provider-operations.service";

export function ProviderOperationsPanel({ providerId }: { providerId: string }) {
  const [profile, setProfile] = useState<ProviderOperationsProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const result = await fetchProviderOperations(providerId);
      if (result.success && result.data) {
        setProfile(result.data);
        setError(null);
      } else {
        setError(result.error ?? "Failed to load operations profile");
      }
    });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [providerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isPending && !profile) {
    return <LoadingSpinner className="py-12" text="Syncing provider data..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={load} />;
  }

  if (!profile) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No operations data.</p>;
  }

  const activities: TimelineItem[] = profile.recentActivities.map((a) => ({
    id: a.id,
    title: a.type,
    description: a.description,
    timestamp: a.timestamp,
    icon: Activity,
    accent: a.type === "BOOKING" ? "teal" : "amber",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <AvailabilityBadge availability={profile.availability} />
        <PerformanceTierBadge tier={profile.performance.tier} score={profile.performance.score} />
      </div>

      <DetailGrid>
        <DetailItem
          label="Total Earnings"
          value={formatCurrency(profile.earnings.total)}
        />
        <DetailItem
          label="Monthly Earnings"
          value={formatCurrency(profile.earnings.monthly)}
        />
        <DetailItem label="Completed Jobs" value={profile.jobs.completed} />
        <DetailItem label="Cancelled Jobs" value={profile.jobs.cancelled} />
        <DetailItem
          label="Acceptance Rate"
          value={`${Math.round(profile.jobs.acceptanceRate * 100)}%`}
        />
        <DetailItem
          label="Cancellation Rate"
          value={`${Math.round(profile.jobs.cancellationRate * 100)}%`}
        />
        <DetailItem
          label="Referrals Made"
          value={
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {profile.referralsMade}
            </span>
          }
        />
        <DetailItem
          label="Performance Score"
          value={
            <span className="flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
              {profile.performance.score}/100
            </span>
          }
        />
      </DetailGrid>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent Activity
        </p>
        {activities.length > 0 ? (
          <Timeline items={activities} />
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        )}
      </div>
    </div>
  );
}
