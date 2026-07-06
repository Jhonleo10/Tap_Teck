"use client";

import { useMemo, useState, useEffect, useTransition, useCallback } from "react";
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
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingCard } from "@/components/shared/loading-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderDetailDialog } from "@/components/providers/provider-detail-dialog";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { getProviders, getProviderById, getProviderStats } from "@/actions/providers";
import { formatDate, shortId } from "@/lib/utils";
import {
  EMPTY_DATE_RANGE,
  hasActiveDateRange,
  type DateRange,
} from "@/lib/date-filters";
import { useCountry } from "@/components/providers/country-provider";
import { getLocationDisplayLabel } from "@/lib/countries";
import { getCountrySubServiceOptions, getCategoryLabel } from "@/lib/catalog";
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
  const { countryCode, country, services, isReady } = useCountry();
  const [data, setData] = useState(initialData);
  const [stats, setStats] = useState(initialStats);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [subServiceFilter, setSubServiceFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [search, setSearch] = useState(initialSearch);
  const [detailProvider, setDetailProvider] = useState<
    import("@/actions/providers").ProviderDetail | null
  >(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const subServiceOptions = useMemo(
    () => getCountrySubServiceOptions(countryCode, serviceFilter),
    [countryCode, serviceFilter]
  );

  const loadProviders = useCallback(
    (
      page = 1,
      pageSize = data.pageSize,
      overrides?: Partial<{
        status: string;
        verification: string;
        service: string;
        subService: string;
        location: string;
        search: string;
        dateRange: DateRange;
      }>
    ) => {
      const status = overrides?.status ?? statusFilter;
      const verification = overrides?.verification ?? verificationFilter;
      const service = overrides?.service ?? serviceFilter;
      const subService = overrides?.subService ?? subServiceFilter;
      const location = overrides?.location ?? locationFilter;
      const query = overrides?.search ?? search;
      const range = overrides?.dateRange ?? dateRange;

      const filters = {
        country: countryCode,
        status: (status === "all" ? "ALL" : status) as ProviderStatus | "ALL",
        verificationStatus: (verification === "all"
          ? "ALL"
          : verification) as VerificationStatus | "ALL",
        service,
        subService,
        location,
        search: query.trim() || undefined,
        dateFrom: range.from || undefined,
        dateTo: range.to || undefined,
      };

      startTransition(async () => {
        const [listResult, statsResult] = await Promise.all([
          getProviders({ ...filters, page, pageSize }),
          getProviderStats(filters),
        ]);
        if (listResult.success && listResult.data) setData(listResult.data);
        if (statsResult.success && statsResult.data) setStats(statsResult.data);
      });
    },
    [
      countryCode,
      statusFilter,
      verificationFilter,
      serviceFilter,
      subServiceFilter,
      locationFilter,
      search,
      dateRange,
      data.pageSize,
    ]
  );

  useEffect(() => {
    if (!isReady) return;
    setStatusFilter("all");
    setVerificationFilter("all");
    setServiceFilter("all");
    setSubServiceFilter("all");
    setLocationFilter("all");
    setDateRange(EMPTY_DATE_RANGE);
    setSearch("");
    startTransition(async () => {
      const [listResult, statsResult] = await Promise.all([
        getProviders({ country: countryCode, page: 1, pageSize: data.pageSize }),
        getProviderStats({ country: countryCode }),
      ]);
      if (listResult.success && listResult.data) setData(listResult.data);
      if (statsResult.success && statsResult.data) setStats(statsResult.data);
    });
  }, [countryCode, isReady, data.pageSize]);

  const serviceChart = useMemo(() => {
    const counts: Record<string, number> = {};
    data.items.forEach((p) => {
      const name = p.primaryService ?? "Unassigned";
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data.items]);

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

  const resetFilters = () => {
    setStatusFilter("all");
    setVerificationFilter("all");
    setServiceFilter("all");
    setSubServiceFilter("all");
    setLocationFilter("all");
    setDateRange(EMPTY_DATE_RANGE);
    setSearch("");
    loadProviders(1);
  };

  const columns: ColumnDef<ProviderRow>[] = [
    {
      accessorKey: "id",
      header: "Provider ID",
      cell: ({ row }) => (
        <code className="text-xs font-mono text-muted-foreground" title={row.original.id}>
          {shortId(row.original.id)}
        </code>
      ),
    },
    {
      accessorKey: "businessName",
      header: "Business",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.businessName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.user.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "primaryService",
      header: "Service",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-sm">{row.original.primaryService ?? "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "verificationStatus",
      header: "Verification",
      cell: ({ row }) => <StatusBadge status={row.original.verificationStatus} />,
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
        <span className="whitespace-nowrap text-xs text-muted-foreground">
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

  const exportData = data.items.map((p) => ({
    providerId: p.id,
    name: p.businessName,
    email: p.user.email,
    service: p.primaryService ?? "",
    status: p.status,
    verification: p.verificationStatus,
    bookings: p._count.bookings,
    location: p.city ?? p.location,
    joined: formatDate(p.createdAt),
  }));

  const exportColumns = [
    { key: "providerId" as const, label: "Provider ID" },
    { key: "name" as const, label: "Business" },
    { key: "email" as const, label: "Email" },
    { key: "service" as const, label: "Service" },
    { key: "status" as const, label: "Status" },
    { key: "verification" as const, label: "Verification" },
    { key: "bookings" as const, label: "Bookings" },
    { key: "location" as const, label: "Location" },
    { key: "joined" as const, label: "Joined" },
  ];

  const hasActiveFilters =
    statusFilter !== "all" ||
    verificationFilter !== "all" ||
    serviceFilter !== "all" ||
    subServiceFilter !== "all" ||
    locationFilter !== "all" ||
    hasActiveDateRange(dateRange) ||
    search.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Providers"
        description={`${country.flag} ${country.name} — View service partners, filter by service, and inspect profiles`}
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

      <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              loadProviders(1, data.pageSize, { status: v });
            }}
          >
            <SelectTrigger className="h-9 w-36 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={verificationFilter}
            onValueChange={(v) => {
              setVerificationFilter(v);
              loadProviders(1, data.pageSize, { verification: v });
            }}
          >
            <SelectTrigger className="h-9 w-40 rounded-xl">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verification</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={serviceFilter}
            onValueChange={(v) => {
              setServiceFilter(v);
              setSubServiceFilter("all");
              loadProviders(1, data.pageSize, { service: v, subService: "all" });
            }}
          >
            <SelectTrigger className="h-9 w-44 rounded-xl">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.title}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            key={`${countryCode}-${serviceFilter}`}
            value={subServiceFilter}
            onValueChange={(v) => {
              setSubServiceFilter(v);
              loadProviders(1, data.pageSize, { subService: v });
            }}
          >
            <SelectTrigger className="h-9 w-48 rounded-xl">
              <SelectValue placeholder="Sub-Service" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(20rem,70vh)] overflow-y-auto">
              <SelectItem value="all">All Sub-Services</SelectItem>
              {subServiceOptions.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            key={countryCode}
            value={locationFilter}
            onValueChange={(v) => {
              setLocationFilter(v);
              loadProviders(1, data.pageSize, { location: v });
            }}
          >
            <SelectTrigger className="h-9 w-44 rounded-xl">
              <SelectValue placeholder="Location">
                {locationFilter === "all"
                  ? "All Locations"
                  : getLocationDisplayLabel(countryCode, locationFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[min(20rem,70vh)] overflow-y-auto">
              <SelectItem value="all">All Locations</SelectItem>
              {country.regions.map((region) => (
                <SelectGroup key={region.state}>
                  <SelectLabel>{region.state}</SelectLabel>
                  <SelectItem value={`state:${region.state}`}>All of {region.state}</SelectItem>
                  {region.cities.map((city) => (
                    <SelectItem key={city} value={city} className="pl-6">
                      {city}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          <div className="relative min-w-[12rem] flex-1 sm:min-w-[16rem] sm:max-w-xs">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadProviders(1);
              }}
              placeholder="Search ID, name, email…"
              className="h-9 rounded-xl"
            />
          </div>

          <DateRangeFilter value={dateRange} onChange={setDateRange} label="Joined" />

          <Button
            variant="default"
            size="sm"
            className="h-9 rounded-xl"
            onClick={() => loadProviders(1)}
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
          {data.total} provider{data.total === 1 ? "" : "s"} match your filters
        </p>
      </div>

      {serviceChart.length > 0 && (
        <ChartCard title="Providers by Service">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serviceChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {serviceChart.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {isPending ? (
        <LoadingCard rows={8} showHeader={false} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data.items}
            searchPlaceholder="Filter current page…"
            defaultSorting={[{ id: "createdAt", desc: true }]}
            showPagination={false}
          />

          <PaginationControls
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(p) => loadProviders(p)}
            onPageSizeChange={(size) => loadProviders(1, size)}
          />
        </>
      )}

      <ProviderDetailDialog
        provider={detailProvider}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        categoryLabel={
          detailProvider
            ? getCategoryLabel(detailProvider.serviceCategory as Exclude<ServiceCategoryId, "all">)
            : undefined
        }
      />
    </div>
  );
}
