"use client";

import { useCallback } from "react";
import {
  Activity,
  Database,
  Bell,
  HardDrive,
  RefreshCw,
  Server,
} from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { fetchPlatformHealth } from "@/actions/operations";
import { useOperationsPoll } from "@/hooks/use-operations-poll";
import { cn } from "@/lib/utils";
import type { PlatformHealth } from "@/services/platform-health.service";

function StatusDot({ status }: { status: "healthy" | "degraded" | "down" }) {
  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full",
        status === "healthy" && "bg-[#22C55E]",
        status === "degraded" && "bg-amber-500",
        status === "down" && "bg-red-500"
      )}
    />
  );
}

function HealthRow({
  icon: Icon,
  label,
  status,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  status: "healthy" | "degraded" | "down";
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {detail && <span>{detail}</span>}
        <StatusDot status={status} />
        <span className="capitalize">{status}</span>
      </div>
    </div>
  );
}

export function PlatformHealthWidget({ className }: { className?: string }) {
  const fetcher = useCallback(() => fetchPlatformHealth(), []);
  const { data, isPending, refresh } = useOperationsPoll<PlatformHealth>({
    fetcher,
    intervalMs: 120_000,
    deferMs: 500,
  });

  return (
    <GlassCard className={cn("p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Platform Health</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={refresh}
          disabled={isPending}
        >
          <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
        </Button>
      </div>

      {data ? (
        <div className="divide-y divide-border/50">
          <HealthRow
            icon={Activity}
            label="API"
            status={data.api.status}
            detail={`${data.api.latencyMs}ms`}
          />
          <HealthRow
            icon={Database}
            label="Database"
            status={data.database.status}
            detail={`${data.database.latencyMs}ms`}
          />
          <HealthRow
            icon={Bell}
            label="Notifications"
            status={data.notifications.status}
            detail={`${data.notifications.pending} unread`}
          />
          <HealthRow icon={HardDrive} label="Storage" status={data.storage.status} />
          <div className="space-y-1 pt-3 text-xs text-muted-foreground">
            <p>Prisma: {data.prismaConnected ? "Connected" : "Disconnected"}</p>
            <p>Environment: {data.environment}</p>
            <p>Last sync: {new Date(data.lastSync).toLocaleString()}</p>
            <p>Server: {new Date(data.serverTime).toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Checking platform status...</p>
      )}
    </GlassCard>
  );
}
