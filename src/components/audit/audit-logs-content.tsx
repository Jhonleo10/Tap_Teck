"use client";

import { useCallback, useState, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ErrorCard } from "@/components/shared/error-card";
import { LoadingCard } from "@/components/shared/loading-card";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ExportButtons } from "@/components/shared/export-buttons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuditLogs } from "@/actions/audit";
import { AuditTimelineView } from "@/components/operations/audit-timeline";
import { formatDate, shortId } from "@/lib/utils";
import {
  EMPTY_DATE_RANGE,
  hasActiveDateRange,
  type DateRange,
} from "@/lib/date-filters";
import type { PaginatedResult } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";
import { isActionSuccess } from "@/lib/unwrap-action";

type AuditLogRow = Prisma.AuditLogGetPayload<{
  select: {
    id: true;
    action: true;
    entityType: true;
    entityId: true;
    adminId: true;
    adminName: true;
    metadata: true;
    createdAt: true;
  };
}>;

interface AuditLogsContentProps {
  initialData: PaginatedResult<AuditLogRow>;
  filterOptions: { actions: string[]; entityTypes: string[] };
}

export function AuditLogsContent({ initialData, filterOptions }: AuditLogsContentProps) {
  const [data, setData] = useState(initialData);
  const [options] = useState(filterOptions);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadLogs = useCallback(
    (
      page = 1,
      pageSize = data.pageSize,
      overrides?: Partial<{
        action: string;
        entityType: string;
        search: string;
        dateRange: DateRange;
      }>
    ) => {
      const action = overrides?.action ?? actionFilter;
      const entityType = overrides?.entityType ?? entityFilter;
      const query = overrides?.search ?? search;
      const range = overrides?.dateRange ?? dateRange;

      startTransition(async () => {
        const result = await getAuditLogs({
          page,
          pageSize,
          search: query.trim() || undefined,
          action: action === "all" ? undefined : action,
          entityType: entityType === "all" ? undefined : entityType,
          dateFrom: range.from || undefined,
          dateTo: range.to || undefined,
        });
        if (isActionSuccess(result)) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error ?? "Failed to load audit logs");
        }
      });
    },
    [actionFilter, entityFilter, search, dateRange, data.pageSize]
  );

  const resetFilters = () => {
    setActionFilter("all");
    setEntityFilter("all");
    setDateRange(EMPTY_DATE_RANGE);
    setSearch("");
    loadLogs(1, data.pageSize, {
      action: "all",
      entityType: "all",
      search: "",
      dateRange: EMPTY_DATE_RANGE,
    });
  };

  const hasActiveFilters =
    actionFilter !== "all" ||
    entityFilter !== "all" ||
    hasActiveDateRange(dateRange) ||
    search.trim().length > 0;

  const columns: ColumnDef<AuditLogRow>[] = [
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span className="font-medium capitalize">
          {row.original.action.replace(/_/g, " ").toLowerCase()}
        </span>
      ),
    },
    { accessorKey: "entityType", header: "Entity" },
    {
      accessorKey: "entityId",
      header: "Entity ID",
      cell: ({ row }) => (
        <code className="text-xs font-mono text-muted-foreground" title={row.original.entityId}>
          {shortId(row.original.entityId)}
        </code>
      ),
    },
    {
      accessorKey: "adminName",
      header: "Admin",
      cell: ({ row }) => row.original.adminName ?? "System",
    },
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
      sortingFn: "datetime",
    },
  ];

  const exportData = data.items.map((row) => ({
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    admin: row.adminName ?? "System",
    timestamp: formatDate(row.createdAt),
  }));

  if (error) {
    return <ErrorCard message={error} onRetry={() => loadLogs(data.page, data.pageSize)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track admin actions across verification, bookings, rewards, and settings"
        badge="Security"
      >
        <ExportButtons
          data={exportData}
          filename="audit-logs"
          title="Audit Logs Export"
          columns={[
            { key: "action", label: "Action" },
            { key: "entityType", label: "Entity" },
            { key: "entityId", label: "Entity ID" },
            { key: "admin", label: "Admin" },
            { key: "timestamp", label: "Timestamp" },
          ]}
          showPdf
        />
      </PageHeader>

      <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v);
              loadLogs(1, data.pageSize, { action: v });
            }}
          >
            <SelectTrigger className="h-9 w-48 rounded-xl">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(20rem,70vh)] overflow-y-auto">
              <SelectItem value="all">All Actions</SelectItem>
              {options.actions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={entityFilter}
            onValueChange={(v) => {
              setEntityFilter(v);
              loadLogs(1, data.pageSize, { entityType: v });
            }}
          >
            <SelectTrigger className="h-9 w-44 rounded-xl">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {options.entityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangeFilter value={dateRange} onChange={setDateRange} label="Date" />

          <div className="relative min-w-[12rem] flex-1 sm:min-w-[16rem] sm:max-w-xs">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadLogs(1);
              }}
              placeholder="Search action, entity, admin, ID…"
              className="h-9 rounded-xl"
            />
          </div>

          <Button
            variant="default"
            size="sm"
            className="h-9 rounded-xl"
            onClick={() => loadLogs(1)}
          >
            Apply
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 rounded-xl" onClick={resetFilters}>
              Reset
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {data.total} event{data.total === 1 ? "" : "s"} match your filters
        </p>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4 space-y-4">
          {isPending ? (
            <LoadingCard rows={8} showHeader={false} />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={data.items}
                searchPlaceholder="Filter current page…"
                showPagination={false}
                defaultSorting={[{ id: "createdAt", desc: true }]}
              />

              <PaginationControls
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={(p) => loadLogs(p)}
                onPageSizeChange={(size) => loadLogs(1, size)}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <AuditTimelineView
            entityType={entityFilter === "all" ? undefined : entityFilter}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
