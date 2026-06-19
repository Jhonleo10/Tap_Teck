"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  FilterFn,
} from "@tanstack/react-table";
import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { FileX } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

function getNestedValue(obj: unknown, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

  if (value == null) return "";
  return String(value);
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchKeys?: string[];
  searchPlaceholder?: string;
  pageSize?: number;
  defaultSearch?: string;
  /** Initial sort — defaults to first column desc (latest first when date/id column) */
  defaultSorting?: SortingState;
  /** Hide built-in pagination (use with server-side PaginationControls) */
  showPagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchKeys,
  searchPlaceholder = "Search...",
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  defaultSearch = "",
  defaultSorting = [],
  showPagination = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState(defaultSearch);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageIndex, setPageIndex] = useState(0);

  const resolvedSearchKeys = useMemo(
    () => searchKeys ?? (searchKey ? [searchKey] : []),
    [searchKeys, searchKey]
  );

  const globalFilterFn: FilterFn<TData> = useMemo(
    () => (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase().trim();
      if (!query) return true;

      if (resolvedSearchKeys.length > 0) {
        return resolvedSearchKeys.some((key) =>
          getNestedValue(row.original, key).toLowerCase().includes(query)
        );
      }

      return JSON.stringify(row.original).toLowerCase().includes(query);
    },
    [resolvedSearchKeys]
  );

  useEffect(() => {
    if (defaultSearch) setGlobalFilter(defaultSearch);
  }, [defaultSearch]);

  useEffect(() => {
    setPageIndex(0);
  }, [globalFilter, pageSize, data.length]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    globalFilterFn,
    state: { sorting, columnFilters, globalFilter, pagination: { pageIndex, pageSize } },
  });

  const showSearch = resolvedSearchKeys.length > 0;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48">
                  <EmptyState
                    icon={FileX}
                    title="No results found"
                    description="Try adjusting your search or filters."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && filteredCount > 0 && (
        <PaginationControls
          page={pageIndex + 1}
          pageSize={pageSize}
          total={filteredCount}
          onPageChange={(p) => setPageIndex(p - 1)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
        />
      )}
    </div>
  );
}
