"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ListFilter {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

interface ListFilterBarProps {
  title?: string;
  description?: string;
  filters: ListFilter[];
  resultCount?: number;
  onReset: () => void;
}

export function ListFilterBar({
  title = "Filters",
  description,
  filters,
  resultCount,
  onReset,
}: ListFilterBarProps) {
  const hasActiveFilters = filters.some((f) => f.value !== "all");

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {resultCount !== undefined && (
            <span className="text-xs text-muted-foreground">
              {resultCount} result{resultCount !== 1 ? "s" : ""}
            </span>
          )}
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={onReset}>
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {filters.map((filter) => (
          <div key={filter.id} className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {filter.label}
            </label>
            <Select value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger className="h-10 rounded-xl bg-background">
                <SelectValue placeholder={filter.placeholder ?? `All ${filter.label}`} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
