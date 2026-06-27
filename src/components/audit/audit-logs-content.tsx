"use client";

import { useState, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ErrorCard } from "@/components/shared/error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuditLogs } from "@/actions/audit";
import { AuditTimelineView } from "@/components/operations/audit-timeline";
import { formatDate } from "@/lib/utils";
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

export function AuditLogsContent({
  initialData,
}: {
  initialData: PaginatedResult<AuditLogRow>;
}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const columns: ColumnDef<AuditLogRow>[] = [
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.action.replace(/_/g, " ")}</span>
      ),
    },
    { accessorKey: "entityType", header: "Entity" },
    {
      accessorKey: "adminName",
      header: "Admin",
      cell: ({ row }) => row.original.adminName ?? "System",
    },
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  const loadPage = (page: number, pageSize = data.pageSize, search?: string) => {
    startTransition(async () => {
      const result = await getAuditLogs({ page, pageSize, search });
      if (isActionSuccess(result)) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error ?? "Failed to load audit logs");
      }
    });
  };

  if (error) {
    return <ErrorCard message={error} onRetry={() => loadPage(data.page, data.pageSize)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track admin actions across verification, bookings, and settings"
        badge="Security"
      />

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4 space-y-4">
      <DataTable
        columns={columns}
        data={data.items}
        searchKeys={["action", "entityType", "adminName"]}
        searchPlaceholder="Search audit logs..."
        showPagination={false}
        defaultSorting={[{ id: "createdAt", desc: true }]}
      />

      <PaginationControls
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onPageChange={(p) => loadPage(p)}
        onPageSizeChange={(size) => loadPage(1, size)}
      />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <AuditTimelineView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
