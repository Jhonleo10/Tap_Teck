"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Briefcase, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard, CHART_COLORS } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProviderStatus, updateVerificationStatus, getProviders } from "@/actions/providers";
import { formatDate } from "@/lib/utils";
import { useCountry } from "@/components/providers/country-provider";
import type { ProviderStatus, VerificationStatus } from "@prisma/client";

type ProviderRow = {
  id: string;
  businessName: string;
  serviceCategory: string;
  location: string;
  status: ProviderStatus;
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  canReceiveBookings: boolean;
  rating: number;
  completedJobs: number;
  createdAt: Date;
  user: { name: string | null; email: string; phone: string | null };
};

export function ProvidersContent({ providers }: { providers: ProviderRow[] }) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const { countryCode, isReady } = useCountry();
  const [data, setData] = useState(providers);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isReady) return;
    startTransition(async () => {
      const result = await getProviders(undefined, countryCode);
      setData(result as ProviderRow[]);
    });
  }, [countryCode, isReady]);

  const stats = useMemo(() => ({
    active: data.filter((p) => p.status === "ACTIVE").length,
    pending: data.filter((p) => p.verificationStatus === "PENDING" || p.verificationStatus === "UNDER_REVIEW").length,
    inactive: data.filter((p) => p.status === "INACTIVE").length,
    verified: data.filter((p) => p.isVerified).length,
  }), [data]);

  const categoryChart = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((p) => {
      counts[p.serviceCategory] = (counts[p.serviceCategory] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [data]);

  const filterByStatus = (status: ProviderStatus | "ALL") => {
    if (status === "ALL") return data;
    return data.filter((p) => p.status === status);
  };

  const filterByVerification = (status: VerificationStatus | "ALL") => {
    if (status === "ALL") return data;
    return data.filter((p) => p.verificationStatus === status);
  };

  const handleStatusChange = async (id: string, status: ProviderStatus) => {
    await updateProviderStatus(id, status);
    setData((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    toast.success("Provider status updated");
  };

  const handleVerificationChange = async (
    id: string,
    verificationStatus: VerificationStatus
  ) => {
    await updateVerificationStatus(id, verificationStatus);
    setData((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              verificationStatus,
              isVerified: verificationStatus === "VERIFIED",
              canReceiveBookings: verificationStatus === "VERIFIED",
              status:
                verificationStatus === "VERIFIED"
                  ? "ACTIVE"
                  : verificationStatus === "REJECTED"
                    ? "INACTIVE"
                    : "PENDING",
            }
          : p
      )
    );
    toast.success("Verification status updated");
  };

  const columns: ColumnDef<ProviderRow>[] = [
    {
      accessorKey: "businessName",
      header: "Business",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.businessName}</p>
          <p className="text-xs text-muted-foreground">{row.original.user.email}</p>
        </div>
      ),
    },
    { accessorKey: "serviceCategory", header: "Category" },
    { accessorKey: "location", header: "Location" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(v) => handleStatusChange(row.original.id, v as ProviderStatus)}
        >
          <SelectTrigger className="w-28 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: "verificationStatus",
      header: "Verification",
      cell: ({ row }) => (
        <Select
          value={row.original.verificationStatus}
          onValueChange={(v) =>
            handleVerificationChange(row.original.id, v as VerificationStatus)
          }
        >
          <SelectTrigger className="w-36 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: "canReceiveBookings",
      header: "Bookings",
      cell: ({ row }) => (
        <StatusBadge status={row.original.canReceiveBookings ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => `${row.original.rating.toFixed(1)} ⭐`,
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  const exportData = data.map((p) => ({
    businessName: p.businessName,
    email: p.user.email,
    category: p.serviceCategory,
    location: p.location,
    status: p.status,
    verification: p.verificationStatus,
    rating: p.rating,
    jobs: p.completedJobs,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Providers" description="Manage verified professionals across Cleaning, Automotive, Home Repair, Beauty & more" badge="Service Partners">
        <ExportButtons
          data={exportData}
          filename="providers"
          columns={[
            { key: "businessName", label: "Business" },
            { key: "email", label: "Email" },
            { key: "category", label: "Category" },
            { key: "location", label: "Location" },
            { key: "status", label: "Status" },
            { key: "verification", label: "Verification" },
            { key: "rating", label: "Rating" },
            { key: "jobs", label: "Jobs" },
          ]}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Providers" value={data.length} icon={Briefcase} accent="teal" />
        <StatCard title="Active" value={stats.active} icon={CheckCircle} accent="emerald" />
        <StatCard title="Pending Review" value={stats.pending} icon={Clock} accent="amber" />
        <StatCard title="Verified" value={stats.verified} icon={ShieldCheck} accent="blue" />
      </div>

      {categoryChart.length > 0 && (
        <ChartCard title="Providers by Category">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {categoryChart.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({data.length})</TabsTrigger>
          <TabsTrigger value="active">
            Active ({filterByStatus("ACTIVE").length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({filterByStatus("INACTIVE").length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({filterByVerification("PENDING").length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <DataTable columns={columns} data={data} searchKey="businessName" searchPlaceholder="Search providers..." defaultSearch={initialSearch} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <DataTable columns={columns} data={filterByStatus("ACTIVE")} searchKey="businessName" />
        </TabsContent>
        <TabsContent value="inactive" className="mt-4">
          <DataTable columns={columns} data={filterByStatus("INACTIVE")} searchKey="businessName" />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <DataTable columns={columns} data={filterByVerification("PENDING")} searchKey="businessName" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
