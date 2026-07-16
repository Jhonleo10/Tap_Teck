"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DollarSign, Store, Layers, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { LoadingCard } from "@/components/shared/loading-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProviderPricing, getProviderPricingStats, getProviderPricingDetail } from "@/actions/provider-pricing";
import { formatCurrency, formatDate, shortId } from "@/lib/utils";
import { useCountry } from "@/components/providers/country-provider";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

type PricingItem = {
  id: string;
  providerId: string;
  serviceName: string;
  subServiceName: string | null;
  price: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  provider: {
    id: string;
    businessName: string;
    status: string;
    serviceCategory: string;
    primaryService: string | null;
    user: { name: string | null; email: string };
  };
};

type PricingDetail = {
  id: string;
  businessName: string;
  serviceCategory: string;
  primaryService: string | null;
  status: string;
  user: { name: string | null; email: string; phone: string | null };
  servicePrices: Array<{
    id: string;
    serviceName: string;
    subServiceName: string | null;
    price: number;
    isActive: boolean;
    createdAt: Date;
  }>;
};

export function ProviderPricingContent({
  initialData,
  initialStats,
}: {
  initialData: {
    items: PricingItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  initialStats: {
    totalPrices: number;
    providersWithPrices: number;
    distinctServices: number;
    inactivePrices: number;
  };
}) {
  const { country } = useCountry();
  const [data, setData] = useState(initialData);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState<PricingDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = useCallback(
    (page = 1) => {
      startTransition(async () => {
        const [listResult, statsResult] = await Promise.all([
          getProviderPricing({
            page,
            pageSize: data.pageSize,
            search: search.trim() || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
          }),
          getProviderPricingStats(),
        ]);
        if (listResult.success && listResult.data) setData(listResult.data);
        if (statsResult.success && statsResult.data) setStats(statsResult.data);
      });
    },
    [search, statusFilter, data.pageSize]
  );

  const openProviderDetail = async (providerId: string) => {
    startTransition(async () => {
      const result = await getProviderPricingDetail(providerId);
      if (result.success && result.data) {
        setSelectedProvider(result.data as unknown as PricingDetail);
        setDetailOpen(true);
      } else {
        toast.error(result.error ?? "Failed to load provider pricing");
      }
    });
  };

  const columns: ColumnDef<PricingItem>[] = [
    {
      accessorKey: "provider.businessName",
      header: "Provider",
      cell: ({ row }) => (
        <div className="min-w-0">
          <button
            className="truncate font-medium text-primary hover:underline text-left"
            onClick={() => openProviderDetail(row.original.providerId)}
          >
            {row.original.provider.businessName}
          </button>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.provider.user.email}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "serviceName",
      header: "Service",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.serviceName}</p>
          {row.original.subServiceName && (
            <p className="text-xs text-muted-foreground">{row.original.subServiceName}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">
          {formatCurrency(row.original.price)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.provider.status === "ACTIVE" ? "success" : "secondary"}>
          {row.original.provider.status}
        </Badge>
      ),
    },
    {
      id: "pricingActive",
      header: "Pricing",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
  ];

  const exportData = data.items.map((p) => ({
    provider: p.provider.businessName,
    email: p.provider.user.email,
    service: p.serviceName,
    subService: p.subServiceName ?? "",
    price: p.price,
    status: p.isActive ? "Active" : "Inactive",
    updatedAt: formatDate(p.updatedAt),
  }));

  const exportColumns = [
    { key: "provider" as const, label: "Provider" },
    { key: "email" as const, label: "Email" },
    { key: "service" as const, label: "Service" },
    { key: "subService" as const, label: "Sub-Service" },
    { key: "price" as const, label: "Price" },
    { key: "status" as const, label: "Status" },
    { key: "updatedAt" as const, label: "Last Updated" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider Service Pricing"
        description={`${country.flag} ${country.name} — View prices set by providers for their services`}
        badge="Monetization"
      >
        <ExportButtons
          data={exportData}
          filename="provider-pricing"
          title="Provider Pricing Export"
          columns={exportColumns}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Prices Set" value={stats.totalPrices} icon={DollarSign} accent="teal" />
        <StatCard title="Providers with Pricing" value={stats.providersWithPrices} icon={Store} accent="emerald" />
        <StatCard title="Distinct Services" value={stats.distinctServices} icon={Layers} accent="blue" />
        <StatCard title="Inactive Prices" value={stats.inactivePrices} icon={EyeOff} accent="amber" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); loadData(1); }}>
          <SelectTrigger className="h-9 w-36 rounded-xl">
            <SelectValue placeholder="Provider Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") loadData(1); }}
          placeholder="Search provider, service..."
          className="h-9 max-w-xs rounded-xl"
        />

        <Button
          variant="default"
          size="sm"
          className="h-9 rounded-xl"
          onClick={() => loadData(1)}
        >
          Apply
        </Button>

        <p className="text-xs text-muted-foreground">
          {data.total} price{data.total === 1 ? "" : "s"} found
        </p>
      </div>

      {isPending ? (
        <LoadingCard rows={8} showHeader={false} />
      ) : (
        <DataTable
          columns={columns}
          data={data.items}
          searchPlaceholder="Filter current page..."
          showPagination={false}
        />
      )}

      {/* Provider Detail Drawer */}
      {selectedProvider && detailOpen && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedProvider.businessName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedProvider.user.email}
                  {selectedProvider.user.phone && ` · ${selectedProvider.user.phone}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailOpen(false)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant={selectedProvider.status === "ACTIVE" ? "success" : "secondary"}>
                {selectedProvider.status}
              </Badge>
              <Badge variant="outline">{selectedProvider.serviceCategory}</Badge>
              {selectedProvider.primaryService && (
                <Badge variant="outline">{selectedProvider.primaryService}</Badge>
              )}
            </div>

            <div className="rounded-xl border border-border/50">
              <div className="grid grid-cols-12 gap-2 border-b border-border/50 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-4">Service</div>
                <div className="col-span-3">Sub-Service</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1"></div>
              </div>
              {selectedProvider.servicePrices.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No prices set yet
                </div>
              ) : (
                selectedProvider.servicePrices.map((price) => (
                  <div
                    key={price.id}
                    className="grid grid-cols-12 gap-2 border-b border-border/30 px-4 py-3 text-sm last:border-0"
                  >
                    <div className="col-span-4 font-medium">{price.serviceName}</div>
                    <div className="col-span-3 text-muted-foreground">
                      {price.subServiceName ?? "—"}
                    </div>
                    <div className="col-span-2 text-right font-semibold tabular-nums">
                      {formatCurrency(price.price)}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      {price.isActive ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="col-span-1 text-right text-xs text-muted-foreground">
                      {formatDate(price.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
