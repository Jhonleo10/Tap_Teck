"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Users, UserCheck, UserX, UserMinus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserStatus } from "@/actions/users";
import { formatDate } from "@/lib/utils";
import type { UserStatus } from "@prisma/client";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  status: UserStatus;
  referralCode: string | null;
  createdAt: Date;
  _count: { bookings: number; reviews: number };
};

export function UsersContent({ users }: { users: UserRow[] }) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [data, setData] = useState(users);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const filteredData = useMemo(() => {
    return data.filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (activityFilter === "with_bookings" && user._count.bookings === 0) return false;
      if (activityFilter === "no_bookings" && user._count.bookings > 0) return false;
      return true;
    });
  }, [data, statusFilter, activityFilter]);

  const stats = useMemo(() => ({
    active: data.filter((u) => u.status === "ACTIVE").length,
    inactive: data.filter((u) => u.status === "INACTIVE").length,
    suspended: data.filter((u) => u.status === "SUSPENDED").length,
  }), [data]);

  const growthChart = useMemo(() => {
    const months: Record<string, number> = {};
    filteredData.forEach((u) => {
      const key = new Date(u.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      months[key] = (months[key] ?? 0) + 1;
    });
    return Object.entries(months)
      .map(([month, users]) => ({ month, users }))
      .slice(-6);
  }, [filteredData]);

  const handleStatusChange = async (id: string, status: UserStatus) => {
    await updateUserStatus(id, status);
    setData((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    toast.success("User status updated");
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setActivityFilter("all");
  };

  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(v) => handleStatusChange(row.original.id, v as UserStatus)}
        >
          <SelectTrigger className="w-28 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    { accessorKey: "_count.bookings", header: "Bookings", cell: ({ row }) => row.original._count.bookings },
    { accessorKey: "_count.reviews", header: "Reviews", cell: ({ row }) => row.original._count.reviews },
    { accessorKey: "referralCode", header: "Referral Code", cell: ({ row }) => row.original.referralCode ?? "—" },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => formatDate(row.original.createdAt),
      sortingFn: "datetime",
    },
  ];

  const exportData = filteredData.map((u) => ({
    name: u.name ?? "",
    email: u.email,
    phone: u.phone ?? "",
    status: u.status,
    bookings: u._count.bookings,
    reviews: u._count.reviews,
    referralCode: u.referralCode ?? "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="View and manage customer accounts, status, and engagement" badge="Customers">
        <ExportButtons data={exportData} filename="users" />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={data.length} icon={Users} accent="teal" />
        <StatCard title="Active" value={stats.active} icon={UserCheck} accent="emerald" />
        <StatCard title="Inactive" value={stats.inactive} icon={UserX} accent="amber" />
        <StatCard title="Suspended" value={stats.suspended} icon={UserMinus} accent="rose" />
      </div>

      {growthChart.length > 0 && (
        <ChartCard title="User Registrations (Last 6 Months)">
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
        description="Filter by account status and booking activity"
        resultCount={filteredData.length}
        onReset={resetFilters}
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
              { value: "SUSPENDED", label: "Suspended" },
            ],
          },
          {
            id: "activity",
            label: "Activity",
            value: activityFilter,
            onChange: setActivityFilter,
            options: [
              { value: "all", label: "All Users" },
              { value: "with_bookings", label: "With Bookings" },
              { value: "no_bookings", label: "No Bookings" },
            ],
          },
        ]}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        searchKeys={["name", "email", "phone", "referralCode"]}
        searchPlaceholder="Search by name, email, phone, or referral code..."
        defaultSearch={initialSearch}
        defaultSorting={[{ id: "createdAt", desc: true }]}
      />
    </div>
  );
}
