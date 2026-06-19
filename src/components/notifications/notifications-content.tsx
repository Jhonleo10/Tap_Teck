"use client";

import { useState, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Bell, Check } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Button } from "@/components/ui/button";
import { getNotifications, markNotificationRead } from "@/actions/notifications";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { getNotifications as GetNotifications } from "@/actions/notifications";

type NotificationRow = Awaited<ReturnType<typeof GetNotifications>>["items"][number];

export function NotificationsContent({
  initialData,
}: {
  initialData: Awaited<ReturnType<typeof GetNotifications>>;
}) {
  const [data, setData] = useState(initialData);
  const [, startTransition] = useTransition();

  const loadPage = (page: number, pageSize = data.pageSize) => {
    startTransition(async () => {
      const result = await getNotifications({ page, pageSize });
      setData(result);
    });
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setData((prev) => ({
      ...prev,
      items: prev.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
    toast.success("Marked as read");
  };

  const columns: ColumnDef<NotificationRow>[] = [
    {
      accessorKey: "title",
      header: "Notification",
      cell: ({ row }) => (
        <div>
          <p className={`font-medium ${!row.original.read ? "text-foreground" : "text-muted-foreground"}`}>
            {row.original.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {row.original.body}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => row.original.type.replace(/_/g, " "),
    },
    {
      accessorKey: "provider",
      header: "Recipient",
      cell: ({ row }) =>
        row.original.provider?.businessName ??
        row.original.user?.name ??
        row.original.user?.email ??
        "—",
    },
    {
      accessorKey: "createdAt",
      header: "Sent",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        !row.original.read ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg"
            onClick={() => handleMarkRead(row.original.id)}
          >
            <Check className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Verification messages and alerts sent to providers and users"
        badge="Communications"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Total" value={data.total} icon={Bell} accent="teal" />
        <StatCard title="Unread" value={data.unreadCount} icon={Bell} accent="amber" />
      </div>

      <DataTable
        columns={columns}
        data={data.items}
        searchKeys={["title", "body", "type"]}
        searchPlaceholder="Search notifications..."
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
