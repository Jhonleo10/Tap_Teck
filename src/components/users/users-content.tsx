"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Users, UserCheck, UserX, Eye } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { ListFilterBar } from "@/components/shared/list-filter-bar";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ErrorCard } from "@/components/shared/error-card";
import { LoadingCard } from "@/components/shared/loading-card";
import { Button } from "@/components/ui/button";
import { UserDetailDialog } from "@/components/users/user-detail-dialog";
import {
  getUserById,
  getUsers,
  type UserListItem,
  type UserStats,
  type UserDetail,
} from "@/actions/users";
import { useServerList } from "@/hooks/use-server-list";
import { formatDate, shortId } from "@/lib/utils";
import {
  EMPTY_DATE_RANGE,
  hasActiveDateRange,
  type DateRange,
} from "@/lib/date-filters";
import type { PaginatedResult } from "@/lib/pagination";
import type { UserStatus } from "@prisma/client";

export function UsersContent({
  initialData,
  initialStats,
}: {
  initialData: PaginatedResult<UserListItem>;
  initialStats: UserStats;
}) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [stats, setStats] = useState(initialStats);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [referralFilter, setReferralFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [search, setSearch] = useState(initialSearch);
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [, startTransition] = useTransition();

  const { data, error, isPending, changePage, applyFilters, retry } = useServerList({
    initialData,
    fetcher: getUsers,
  });

  const buildFilters = () => ({
    search: search || undefined,
    status: statusFilter === "all" ? ("ALL" as const) : (statusFilter as UserStatus),
    hasReferral:
      referralFilter === "has_code"
        ? ("YES" as const)
        : referralFilter === "no_code"
          ? ("NO" as const)
          : ("ALL" as const),
    dateFrom: dateRange.from || undefined,
    dateTo: dateRange.to || undefined,
  });

  const refreshWithFilters = () => {
    applyFilters(buildFilters());
    startTransition(async () => {
      const { getUserStats } = await import("@/actions/users");
      const statsResult = await getUserStats(buildFilters());
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    });
  };

  const growthChart = useMemo(() => {
    const months: Record<string, number> = {};
    data.items.forEach((u) => {
      const key = new Date(u.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      months[key] = (months[key] ?? 0) + 1;
    });
    return Object.entries(months)
      .map(([month, users]) => ({ month, users }))
      .slice(-6);
  }, [data.items]);

  const openDetail = async (id: string) => {
    startTransition(async () => {
      const result = await getUserById(id);
      if (result.success && result.data) {
        setDetailUser(result.data);
        setDetailOpen(true);
      } else {
        toast.error(result.error ?? "Failed to load user");
      }
    });
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setReferralFilter("all");
    setDateRange(EMPTY_DATE_RANGE);
    setSearch("");
    applyFilters({});
  };

  const columns: ColumnDef<UserListItem>[] = [
    {
      accessorKey: "id",
      header: "User ID",
      cell: ({ row }) => (
        <code className="text-xs font-mono text-muted-foreground">
          {shortId(row.original.id)}
        </code>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <p className="font-medium">{row.original.name ?? "—"}</p>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "_count.bookings",
      header: "Bookings",
      cell: ({ row }) => row.original._count.bookings,
    },
    {
      accessorKey: "_count.reviews",
      header: "Reviews",
      cell: ({ row }) => row.original._count.reviews,
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(row.original.createdAt)}
        </span>
      ),
      sortingFn: "datetime",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          onClick={() => openDetail(row.original.id)}
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
      ),
    },
  ];

  const exportData = data.items.map((u) => ({
    userId: u.id,
    name: u.name ?? "",
    email: u.email,
    status: u.status,
    bookings: u._count.bookings,
    reviews: u._count.reviews,
    joined: formatDate(u.createdAt),
  }));

  const exportColumns = [
    { key: "userId" as const, label: "User ID" },
    { key: "name" as const, label: "Name" },
    { key: "email" as const, label: "Email" },
    { key: "status" as const, label: "Status" },
    { key: "bookings" as const, label: "Bookings" },
    { key: "reviews" as const, label: "Reviews" },
    { key: "joined" as const, label: "Joined" },
  ];

  if (error) {
    return <ErrorCard message={error} onRetry={retry} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="View customer accounts — filter, export, and inspect profiles"
        badge="Customers"
      >
        <ExportButtons
          data={exportData}
          filename="users"
          title="Users Export"
          columns={exportColumns}
          showPdf
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Users" value={stats.total} icon={Users} accent="teal" />
        <StatCard title="Active" value={stats.active} icon={UserCheck} accent="emerald" />
        <StatCard title="Inactive" value={stats.inactive} icon={UserX} accent="amber" />
      </div>

      {growthChart.length > 0 && (
        <ChartCard title="User Registrations (Current Page)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthChart}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#006F5F" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#006F5F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#006F5F"
                fill="url(#userGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ListFilterBar
        description="Filter by status, referrals, and join date"
        resultCount={data.total}
        onReset={resetFilters}
        hasExtraFilters={hasActiveDateRange(dateRange)}
        extra={<DateRangeFilter value={dateRange} onChange={setDateRange} label="Joined date" />}
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "All Statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ],
          },
          {
            id: "referral",
            label: "Referral",
            value: referralFilter,
            onChange: setReferralFilter,
            options: [
              { value: "all", label: "All" },
              { value: "has_code", label: "Has Referral Code" },
              { value: "no_code", label: "No Referral Code" },
            ],
          },
        ]}
        onApply={refreshWithFilters}
      />

      {isPending ? (
        <LoadingCard rows={8} showHeader={false} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data.items}
            searchKeys={["name", "email", "phone", "referralCode", "id"]}
            searchPlaceholder="Search by name, email, or ID..."
            defaultSearch={search}
            showPagination={false}
            defaultSorting={[{ id: "createdAt", desc: true }]}
          />
          <PaginationControls
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(p) => changePage(p)}
            onPageSizeChange={(size) => changePage(1, size)}
          />
        </>
      )}

      <UserDetailDialog user={detailUser} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
