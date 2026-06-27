"use client";

import { useCallback } from "react";
import { Shield } from "lucide-react";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { fetchAuditTimeline } from "@/actions/operations";
import { useOperationsPoll } from "@/hooks/use-operations-poll";

export function AuditTimelineView({ entityType }: { entityType?: string }) {
  const fetcher = useCallback(
    () => fetchAuditTimeline({ entityType, limit: 40 }),
    [entityType]
  );

  const { data: logs, isPending } = useOperationsPoll({
    fetcher,
    intervalMs: 60_000,
  });

  if (isPending && !logs) {
    return <LoadingSpinner className="py-12" text="Loading audit timeline..." />;
  }

  if (!logs?.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No audit events.</p>;
  }

  const items: TimelineItem[] = logs.map((log) => ({
    id: log.id,
    title: log.action.replace(/_/g, " "),
    description: `${log.entityType} · ${log.adminName ?? "System"}`,
    timestamp: log.createdAt,
    icon: Shield,
    accent: log.action.includes("DELETE") ? "amber" : "teal",
  }));

  return <Timeline items={items} />;
}
