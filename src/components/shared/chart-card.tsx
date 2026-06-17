"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function ChartCard({ title, children, className, action }: ChartCardProps) {
  return (
    <Card className={cn("overflow-hidden border-border/60 shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export const CHART_COLORS = [
  "#004D40",
  "#006F5F",
  "#0E8A72",
  "#14B8A6",
  "#34D399",
  "#6EE7B7",
  "#F59E0B",
  "#EF4444",
];

export const BRAND_COLORS = {
  primary: "#004D40",
  secondary: "#0E8A72",
  accent: "#14B8A6",
};
