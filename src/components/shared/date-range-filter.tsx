"use client";

import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DateRange } from "@/lib/date-filters";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
}

export function DateRangeFilter({
  value,
  onChange,
  label = "Date range",
}: DateRangeFilterProps) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="h-10 rounded-xl bg-background"
          aria-label="From date"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="h-10 rounded-xl bg-background"
          aria-label="To date"
        />
      </div>
    </div>
  );
}
