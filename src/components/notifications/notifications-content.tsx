"use client";

import { useMemo, useState, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Bell, Check } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ErrorCard } from "@/components/shared/error-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNotifications, markNotificationRead } from "@/actions/notifications";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { isActionSuccess } from "@/lib/unwrap-action";
import type { PaginatedResult } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

type NotificationRow = Prisma.NotificationGetPayload<{
  select: {
    id: true;
    type: true;
    title: true;
    body: true;
    read: true;
    createdAt: true;
    providerId: true;
    userId: true;
    provider: { select: { businessName: true } };
    user: { select: { name: true; email: true } };
  };
}>;

type NotificationsData = PaginatedResult<NotificationRow> & { unreadCount: number };

export function NotificationsContent({
  initialData,
}: {
  initialData: NotificationsData;
}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [, startTransition] = useTransition();

  const channelGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    data.items.forEach((n) => {
      const channel = n.type.includes("VERIFICATION")
        ? "Verification"
        : n.type.includes("REWARD")
          ? "Rewards"
          : n.type.includes("BOOKING")
            ? "Bookings"
            : "System";
      groups[channel] = (groups[channel] ?? 0) + 1;
    });
    return groups;
  }, [data.items]);

  const filteredItems = useMemo(() => {
    if (channelFilter === "all") return data.items;
    return data.items.filter((n) => {
      const channel = n.type.includes("VERIFICATION")
        ? "verification"
        : n.type.includes("REWARD")
          ? "rewards"
          : n.type.includes("BOOKING")
            ? "bookings"
            : "system";
      return channel === channelFilter;
    });
  }, [data.items, channelFilter]);

  const loadPage = (page: number, pageSize = data.pageSize) => {
    startTransition(async () => {
      const result = await getNotifications({ page, pageSize });
      if (isActionSuccess(result)) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error ?? "Failed to load notifications");
      }
    });
  };

  const handleMarkRead = async (id: string) => {
    const result = await markNotificationRead(id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to mark as read");
      return;
    }
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
          <p
            className={`font-medium ${!row.original.read ? "text-foreground" : "text-muted-foreground"}`}
          >
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
            aria-label="Mark notification as read"
          >
            <Check className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  if (error) {
    return <ErrorCard message={error} onRetry={() => loadPage(data.page, data.pageSize)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Verification messages and alerts sent to providers and users"
        badge="Communications"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total" value={data.total} icon={Bell} accent="teal" />
        <StatCard title="Unread" value={data.unreadCount} icon={Bell} accent="amber" />
        <StatCard title="Delivered" value={data.items.filter((n) => n.read).length} icon={Check} accent="emerald" />
        <StatCard title="Failed" value={0} icon={Bell} accent="blue" />
      </div>

      <Tabs value={channelFilter} onValueChange={setChannelFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({data.items.length})</TabsTrigger>
          <TabsTrigger value="verification">
            Verification ({channelGroups.Verification ?? 0})
          </TabsTrigger>
          <TabsTrigger value="rewards">Rewards ({channelGroups.Rewards ?? 0})</TabsTrigger>
          <TabsTrigger value="bookings">Bookings ({channelGroups.Bookings ?? 0})</TabsTrigger>
          <TabsTrigger value="system">System ({channelGroups.System ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value={channelFilter} className="mt-4">
      <DataTable
        columns={columns}
        data={filteredItems}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
