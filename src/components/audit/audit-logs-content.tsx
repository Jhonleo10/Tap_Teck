"use client";

import { useState, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { getAuditLogs } from "@/actions/notifications";
import { formatDate } from "@/lib/utils";
import type { getAuditLogs as GetAuditLogs } from "@/actions/notifications";

type AuditLogRow = Awaited<ReturnType<typeof GetAuditLogs>>["items"][number];

export function AuditLogsContent({
  initialData,
}: {
  initialData: Awaited<ReturnType<typeof GetAuditLogs>>;
}) {
  const [data, setData] = useState(initialData);
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

  const loadPage = (page: number, pageSize = data.pageSize) => {
    startTransition(async () => {
      const result = await getAuditLogs({ page, pageSize });
      setData(result);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track admin actions across verification, bookings, and settings"
        badge="Security"
      />

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
    </div>
  );
}
