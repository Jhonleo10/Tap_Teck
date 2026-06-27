"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  loading?: boolean;
}

export function ChartCard({ title, children, className, action, loading }: ChartCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/40 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/30 bg-muted/20 pb-3">
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-[220px] w-full rounded-xl" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export const CHART_COLORS = [
  "#004D40",
  "#006F5F",
  "#0E8A72",
  "#14B8A6",
  "#22C55E",
  "#34D399",
  "#6EE7B7",
  "#F59E0B",
];

export const BRAND_COLORS = {
  primary: "#006F5F",
  secondary: "#0E8A72",
  accent: "#22C55E",
};
