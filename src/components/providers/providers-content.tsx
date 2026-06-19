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
import { ListFilterBar } from "@/components/shared/list-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { getCountryCategories, getLocationDisplayLabel } from "@/lib/countries";
import { getCountryServicesByCategory } from "@/lib/catalog";
import type { ServiceCategoryId } from "@/lib/services-data";
import type { ProviderStatus, VerificationStatus } from "@prisma/client";

type ProviderRow = {
  id: string;
  businessName: string;
  serviceCategory: string;
  primaryService: string | null;
  location: string;
  city: string | null;
  state: string | null;
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
  const { countryCode, country, locationOptions, isReady } = useCountry();
  const [data, setData] = useState(providers);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [, startTransition] = useTransition();

  const categories = useMemo(
    () => getCountryCategories(countryCode),
    [countryCode]
  );

  const catalogServices = useMemo(
    () =>
      getCountryServicesByCategory(
        countryCode,
        categoryFilter === "all"
          ? "all"
          : (categoryFilter as Exclude<ServiceCategoryId, "all">)
      ),
    [countryCode, categoryFilter]
  );

  useEffect(() => {
    if (!isReady) return;
    startTransition(async () => {
      const result = await getProviders({ country: countryCode });
      setData(result as ProviderRow[]);
    });
    setStatusFilter("all");
    setVerificationFilter("all");
    setCategoryFilter("all");
    setServiceFilter("all");
    setLocationFilter("all");
  }, [countryCode, isReady]);

  const filteredData = useMemo(() => {
    return data.filter((provider) => {
      if (statusFilter !== "all" && provider.status !== statusFilter) return false;
      if (verificationFilter !== "all" && provider.verificationStatus !== verificationFilter) {
        return false;
      }
      if (categoryFilter !== "all" && provider.serviceCategory !== categoryFilter) return false;
      if (serviceFilter !== "all" && provider.primaryService !== serviceFilter) return false;
      if (locationFilter !== "all") {
        if (locationFilter.startsWith("state:")) {
          const stateName = locationFilter.slice(6);
          if (provider.state !== stateName) return false;
        } else if (provider.city !== locationFilter && provider.location !== locationFilter) {
          return false;
        }
      }
      return true;
    });
  }, [data, statusFilter, verificationFilter, categoryFilter, serviceFilter, locationFilter]);

  const stats = useMemo(() => ({
    active: data.filter((p) => p.status === "ACTIVE").length,
    pending: data.filter((p) => p.verificationStatus === "PENDING" || p.verificationStatus === "UNDER_REVIEW").length,
    inactive: data.filter((p) => p.status === "INACTIVE").length,
    verified: data.filter((p) => p.isVerified).length,
  }), [data]);

  const categoryChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach((p) => {
      const label =
        categories.find((c) => c.id === p.serviceCategory)?.label ?? p.serviceCategory;
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [filteredData, categories]);

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

  const resetFilters = () => {
    setStatusFilter("all");
    setVerificationFilter("all");
    setCategoryFilter("all");
    setServiceFilter("all");
    setLocationFilter("all");
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
    { accessorKey: "serviceCategory", header: "Category", cell: ({ row }) => {
        const label = categories.find((c) => c.id === row.original.serviceCategory)?.label;
        return label ?? row.original.serviceCategory;
      }},
    {
      accessorKey: "primaryService",
      header: "Service",
      cell: ({ row }) => row.original.primaryService ?? "—",
    },
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

  const exportData = filteredData.map((p) => ({
    businessName: p.businessName,
    email: p.user.email,
    category: categories.find((c) => c.id === p.serviceCategory)?.label ?? p.serviceCategory,
    service: p.primaryService ?? "",
    location: p.location,
    status: p.status,
    verification: p.verificationStatus,
    rating: p.rating,
    jobs: p.completedJobs,
  }));

  const locationFilterDescription =
    locationFilter !== "all"
      ? getLocationDisplayLabel(countryCode, locationFilter)
      : undefined;

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
            { key: "service", label: "Service" },
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

      <ListFilterBar
        description={`${country.flag} ${country.name}${locationFilterDescription ? ` · ${locationFilterDescription}` : ""}`}
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
              { value: "PENDING", label: "Pending" },
            ],
          },
          {
            id: "verification",
            label: "Verification",
            value: verificationFilter,
            onChange: setVerificationFilter,
            options: [
              { value: "all", label: "All Verification" },
              { value: "PENDING", label: "Pending" },
              { value: "UNDER_REVIEW", label: "Under Review" },
              { value: "VERIFIED", label: "Verified" },
              { value: "REJECTED", label: "Rejected" },
            ],
          },
          {
            id: "category",
            label: "Category",
            value: categoryFilter,
            onChange: (value) => {
              setCategoryFilter(value);
              setServiceFilter("all");
            },
            options: [
              { value: "all", label: "All Categories" },
              ...categories.map((c) => ({ value: c.id, label: c.label })),
            ],
          },
          {
            id: "service",
            label: "Service",
            value: serviceFilter,
            onChange: setServiceFilter,
            options: [
              { value: "all", label: "All Services" },
              ...catalogServices.map((s) => ({ value: s.title, label: s.title })),
            ],
          },
          {
            id: "location",
            label: "Location",
            value: locationFilter,
            onChange: setLocationFilter,
            options: [
              { value: "all", label: "All Locations" },
              ...locationOptions.map((opt) => ({
                value: opt.value,
                label: opt.type === "state" ? `All of ${opt.label}` : opt.label,
              })),
            ],
          },
        ]}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        searchKeys={["businessName", "user.email", "user.name", "primaryService", "serviceCategory", "location", "city"]}
        searchPlaceholder="Search by business, service, email, or location..."
        defaultSearch={initialSearch}
        defaultSorting={[{ id: "createdAt", desc: true }]}
      />
    </div>
  );
}
