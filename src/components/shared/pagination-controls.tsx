"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildPageNumbers, getPaginationMeta, PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationControlsProps) {
  const { totalPages, safePage, from, to } = getPaginationMeta(total, page, pageSize);
  const pages = buildPageNumbers(safePage, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span>
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs">Rows</span>
            <Select
              value={PAGE_SIZE_OPTIONS.includes(pageSize as (typeof PAGE_SIZE_OPTIONS)[number])
                ? String(pageSize)
                : String(PAGE_SIZE_OPTIONS[0])}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[4.5rem] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg gap-1"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>

        <div className="hidden items-center gap-1 px-1 sm:flex">
          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === safePage ? "default" : "ghost"}
                size="sm"
                className="h-8 min-w-8 rounded-lg px-2"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            )
          )}
        </div>

        <span className="px-2 text-xs text-muted-foreground sm:hidden">
          {safePage}/{totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg gap-1"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
