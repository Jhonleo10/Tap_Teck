"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Briefcase, CheckCircle, Clock, ShieldCheck, Eye } from "lucide-react";
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
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ProviderDetailDialog } from "@/components/providers/provider-detail-dialog";
import { PaginationControls } from "@/components/shared/pagination-controls";
import {
  updateProviderStatus,
  getProviders,
  getProviderById,
  getProviderStats,
} from "@/actions/providers";
import { formatDate, shortId } from "@/lib/utils";
import { EMPTY_DATE_RANGE, hasActiveDateRange, isWithinDateRange, type DateRange } from "@/lib/date-filters";
import { useCountry } from "@/components/providers/country-provider";
import { getCountryCategories, getLocationDisplayLabel } from "@/lib/countries";
import { getCountryServicesByCategory } from "@/lib/catalog";
import type { ServiceCategoryId } from "@/lib/services-data";
import type { ProviderStatus } from "@prisma/client";

type ProviderRow = {
  id: string;
  businessName: string;
  serviceCategory: string;
  primaryService: string | null;
  location: string;
  city: string | null;
  state: string | null;
  status: ProviderStatus;
  verificationStatus: string;
  isVerified: boolean;
  canReceiveBookings: boolean;
  rating: number;
  completedJobs: number;
  createdAt: Date;
  user: { name: string | null; email: string; phone: string | null };
  _count: { bookings: number };
};

export function ProvidersContent({
  initialData,
  initialStats,
}: {
  initialData: import("@/lib/pagination").PaginatedResult<ProviderRow>;
  initialStats: { total: number; active: number; pending: number; verified: number };
}) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const { countryCode, country, locationOptions, isReady } = useCountry();
  const [data, setData] = useState(initialData);
  const [stats, setStats] = useState(initialStats);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [detailProvider, setDetailProvider] = useState<import("@/actions/providers").ProviderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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
      const [listResult, statsResult] = await Promise.all([
        getProviders({ country: countryCode, page: 1, pageSize: data.pageSize }),
        getProviderStats({ country: countryCode }),
      ]);
      if (listResult.success && listResult.data) setData(listResult.data);
      if (statsResult.success && statsResult.data) setStats(statsResult.data);
    });
    setStatusFilter("all");
    setVerificationFilter("all");
    setCategoryFilter("all");
    setServiceFilter("all");
    setLocationFilter("all");
    setDateRange(EMPTY_DATE_RANGE);
  }, [countryCode, isReady, data.pageSize]);

  const items = data.items;

  const filteredData = useMemo(() => {
    return items.filter((provider) => {
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
      if (!isWithinDateRange(provider.createdAt, dateRange)) return false;
      return true;
    });
  }, [items, statusFilter, verificationFilter, categoryFilter, serviceFilter, locationFilter, dateRange]);

  const categoryChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach((p) => {
      const label =
        categories.find((c) => c.id === p.serviceCategory)?.label ?? p.serviceCategory;
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [filteredData, categories]);

  const handleToggleActive = async (id: string, active: boolean) => {
    const status: ProviderStatus = active ? "ACTIVE" : "INACTIVE";
    const result = await updateProviderStatus(id, status);
    if (!result.success) {
      toast.error(result.error ?? "Failed to update provider");
      return;
    }
    setData((prev) => ({
      ...prev,
      items: prev.items.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
    toast.success(`Provider ${active ? "activated" : "deactivated"}`);
  };

  const openDetail = async (id: string) => {
    startTransition(async () => {
      const result = await getProviderById(id);
      if (result.success && result.data) {
        setDetailProvider(result.data);
        setDetailOpen(true);
      } else {
        toast.error(result.error ?? "Failed to load provider");
      }
    });
  };

  const getCategoryLabel = (id: string) =>
    categories.find((c) => c.id === id)?.label ?? id;

  const resetFilters = () => {
    setStatusFilter("all");
    setVerificationFilter("all");
    setCategoryFilter("all");
    setServiceFilter("all");
    setLocationFilter("all");
    setDateRange(EMPTY_DATE_RANGE);
  };

  const columns: ColumnDef<ProviderRow>[] = [
    {
      accessorKey: "id",
      header: "Provider ID",
      cell: ({ row }) => (
        <code className="text-xs font-mono text-muted-foreground">
          {shortId(row.original.id)}
        </code>
      ),
    },
    {
      accessorKey: "businessName",
      header: "Name",
      cell: ({ row }) => (
        <p className="font-medium">{row.original.businessName}</p>
      ),
    },
    {
      accessorKey: "primaryService",
      header: "Service",
      cell: ({ row }) => row.original.primaryService ?? "—",
    },
    {
      accessorKey: "serviceCategory",
      header: "Category",
      cell: ({ row }) => getCategoryLabel(row.original.serviceCategory),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "bookings",
      header: "Bookings",
      cell: ({ row }) => row.original._count.bookings,
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
      id: "active",
      header: "Active / Inactive",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.status === "ACTIVE"}
            onCheckedChange={(checked) => handleToggleActive(row.original.id, checked)}
            aria-label="Toggle provider active status"
          />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {row.original.status === "ACTIVE" ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => openDetail(row.original.id)}
          aria-label="View provider details"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const exportData = filteredData.map((p) => ({
    providerId: p.id,
    name: p.businessName,
    service: p.primaryService ?? "",
    category: getCategoryLabel(p.serviceCategory),
    status: p.status,
    bookings: p._count.bookings,
    verification: p.verificationStatus,
    joined: formatDate(p.createdAt),
  }));

  const exportColumns = [
    { key: "providerId" as const, label: "Provider ID" },
    { key: "name" as const, label: "Name" },
    { key: "service" as const, label: "Service" },
    { key: "category" as const, label: "Category" },
    { key: "status" as const, label: "Status" },
    { key: "bookings" as const, label: "Bookings" },
    { key: "verification" as const, label: "Verification" },
    { key: "joined" as const, label: "Joined" },
  ];

  const locationFilterDescription =
    locationFilter !== "all"
      ? getLocationDisplayLabel(countryCode, locationFilter)
      : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Providers"
        description="Manage service partners — filter, export, and view full profiles"
        badge="Service Partners"
      >
        <ExportButtons
          data={exportData}
          filename="providers"
          title="Providers Export"
          columns={exportColumns}
          showPdf
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Providers" value={stats.total} icon={Briefcase} accent="teal" />
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
        searchPlaceholder="Search providers..."
        defaultSearch={initialSearch}
        defaultSorting={[{ id: "createdAt", desc: true }]}
        showPagination={false}
      />

      <PaginationControls
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        onPageChange={(p) => {
          startTransition(async () => {
            const result = await getProviders({ country: countryCode, page: p, pageSize: data.pageSize });
            if (result.success && result.data) setData(result.data);
          });
        }}
        onPageSizeChange={(size) => {
          startTransition(async () => {
            const result = await getProviders({ country: countryCode, page: 1, pageSize: size });
            if (result.success && result.data) setData(result.data);
          });
        }}
      />

      <ProviderDetailDialog
        provider={detailProvider}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        categoryLabel={
          detailProvider
            ? getCategoryLabel(detailProvider.serviceCategory)
            : undefined
        }
      />
    </div>
  );
}
