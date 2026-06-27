"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  ShieldAlert,
  CalendarCheck,
  TrendingUp,
  DollarSign,
  Filter,
  MapPin,
  Layers,
  ArrowRight,
  BarChart3,
  Sparkles,
  Gift,
  Bell,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionHeader } from "@/components/shared/section-header";
import { ActionCard } from "@/components/shared/action-card";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { GlassCard } from "@/components/shared/glass-card";
import { ChartCard, CHART_COLORS, BRAND_COLORS } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useCountry } from "@/components/providers/country-provider";
import {
  getDashboardData,
  type DashboardPeriod,
  type DashboardFilters,
} from "@/actions/dashboard";
import { getLocationDisplayLabel } from "@/lib/countries";
import { PlatformHealthWidget } from "@/components/operations/platform-health-widget";
import { AIBusinessAdvisorWidget } from "@/components/ai/ai-business-advisor-widget";
import { fetchOperationsSummary } from "@/actions/operations";
import { useOperationsPoll } from "@/hooks/use-operations-poll";
import type { OperationalKPIs, BusinessInsight } from "@/services/business-insights.service";
import { DeferredMount } from "@/components/shared/deferred-mount";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type OpsSummary = Awaited<ReturnType<typeof import("@/services/business-insights.service").getOperationsSummary>>;

interface DashboardContentProps {
  initialData: DashboardData;
  initialOpsSummary?: OpsSummary;
  serverCountry?: string;
}

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

function formatTrendDate(date: string, period: DashboardPeriod) {
  if (period === "year") {
    const [y, m] = date.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("en", {
      month: "short",
    });
  }
  return new Date(date).toLocaleDateString("en", { day: "2-digit", month: "short" });
}

export function DashboardContent({
  initialData,
  initialOpsSummary,
  serverCountry,
}: DashboardContentProps) {
  const { countryCode, country, services, isReady } = useCountry();
  const [data, setData] = useState(initialData);
  const [loadedCountry, setLoadedCountry] = useState(serverCountry ?? countryCode);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [service, setService] = useState("all");
  const [location, setLocation] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isCountryLoading, setIsCountryLoading] = useState(false);

  const opsFetcher = useCallback(
    () => fetchOperationsSummary(countryCode),
    [countryCode]
  );
  const { data: opsSummary } = useOperationsPoll({
    fetcher: opsFetcher,
    intervalMs: 120_000,
    enabled: isReady,
    initialData: countryCode === serverCountry ? initialOpsSummary ?? null : null,
    skipInitialFetch: countryCode === serverCountry && !!initialOpsSummary,
    deferMs: 3_000,
  });

  const fmt = useCallback(
    (amount: number) => formatCurrency(amount, country.currency, country.locale),
    [country]
  );

  const fetchData = useCallback(
    (overrides?: Partial<DashboardFilters>) => {
      const filters: DashboardFilters = {
        country: countryCode,
        period: overrides?.period ?? period,
        service:
          (overrides?.service ?? service) === "all"
            ? undefined
            : (overrides?.service ?? service),
        location:
          (overrides?.location ?? location) === "all"
            ? undefined
            : (overrides?.location ?? location),
        dateFrom: overrides?.dateFrom !== undefined ? overrides.dateFrom : dateFrom || undefined,
        dateTo: overrides?.dateTo !== undefined ? overrides.dateTo : dateTo || undefined,
      };

      startTransition(async () => {
        const result = await getDashboardData(filters);
        setData(result);
        setLoadedCountry(countryCode);
        setIsCountryLoading(false);
      });
    },
    [countryCode, period, service, location, dateFrom, dateTo]
  );

  useEffect(() => {
    if (!isReady) return;
    if (serverCountry && countryCode === serverCountry) {
      return;
    }
    setService("all");
    setLocation("all");
    setDateFrom("");
    setDateTo("");
    setIsCountryLoading(true);
    fetchData({
      service: undefined,
      location: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  }, [countryCode, isReady, serverCountry]); // eslint-disable-line react-hooks/exhaustive-deps

  const metricsReady = loadedCountry === countryCode && !isCountryLoading;

  const chartData = data.revenueTrend.map((d) => ({
    date: formatTrendDate(d.date, period),
    revenue: d.revenue,
  }));

  const totalStatus = data.bookingStatus.reduce((s, b) => s + b.value, 0);
  const pendingBookings =
    data.bookingStatus.find((b) => b.name.toLowerCase().includes("pending"))?.value ?? 0;
  const topCategory = data.categoryRevenue[0]?.name;
  const topService = data.serviceRevenue[0]?.name;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const timelineItems: TimelineItem[] = data.recentBookings.map((b) => ({
    id: b.id,
    title: `Booking ${b.bookingNumber}`,
    description: `${b.serviceName} · ${b.provider.businessName}`,
    timestamp: b.createdAt,
    icon: CalendarCheck,
    accent: "teal",
  }));

  const ruleBasedInsights: BusinessInsight[] = opsSummary?.insights ?? [];
  const operationalKpis: OperationalKPIs | undefined = opsSummary?.kpis;

  const legacyInsights = [
    data.stats.revenueToday > 0
      ? `Today's revenue is ${fmt(data.stats.revenueToday)} across ${country.name}.`
      : `No completed revenue recorded today in ${country.name}.`,
    topCategory
      ? `${topCategory} is the top-performing category this period.`
      : "Category performance data will appear as bookings complete.",
    data.stats.pendingVerification > 0
      ? `${data.stats.pendingVerification} providers are awaiting verification review.`
      : "All provider verifications are up to date.",
    topService
      ? `${topService} leads service revenue in the selected period.`
      : "Service trends will populate as bookings grow.",
  ];

  const insights = ruleBasedInsights.length > 0
    ? ruleBasedInsights.map((i) => i.description)
    : legacyInsights;

  const clearFilters = () => {
    setService("all");
    setLocation("all");
    setDateFrom("");
    setDateTo("");
    setPeriod("month");
    fetchData({
      period: "month",
      service: undefined,
      location: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  return (
    <div className="space-y-10">
      {/* Section 1 — Welcome Hero */}
      <GlassCard className="relative overflow-hidden border-primary/10 p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#006F5F]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#22C55E]/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              TapTeck Operations Center
            </p>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
              {greeting}, Admin
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              {country.flag} {country.name} · {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {data.stats.activeBookings} active bookings · {data.stats.pendingVerification} pending
              verifications
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-xl gap-1.5" asChild>
              <Link href="/verification">
                <ShieldAlert className="h-4 w-4" />
                Review queue
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" asChild>
              <Link href="/analytics">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5" asChild>
              <Link href="/bookings">
                <CalendarCheck className="h-4 w-4" />
                Bookings
              </Link>
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Filters — preserved */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Filter className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Filters</p>
              <p className="text-xs text-muted-foreground">
                {country.flag} {country.name} · {PERIOD_LABELS[period]}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={period}
              onValueChange={(v) => {
                const p = v as DashboardPeriod;
                setPeriod(p);
                fetchData({ period: p });
              }}
            >
              <SelectTrigger className="h-8 w-[120px] rounded-lg border-border/60 bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 rounded-lg px-4" onClick={() => fetchData()}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={clearFilters}>
              Reset
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Service</label>
            <Select
              value={service}
              onValueChange={(v) => {
                setService(v);
                fetchData({ service: v === "all" ? undefined : v });
              }}
            >
              <SelectTrigger className="h-10 rounded-xl bg-background">
                <div className="flex items-center gap-2 truncate">
                  <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All Services" />
                </div>
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
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              State / City
            </label>
            <Select
              key={countryCode}
              value={location}
              onValueChange={(v) => {
                setLocation(v);
                fetchData({ location: v === "all" ? undefined : v });
              }}
            >
              <SelectTrigger className="h-10 rounded-xl bg-background">
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="All Locations">
                    {location === "all"
                      ? "All Locations"
                      : getLocationDisplayLabel(countryCode, location)}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-[min(20rem,70vh)] overflow-y-auto">
                <SelectItem value="all">All Locations</SelectItem>
                {country.regions.map((region) => (
                  <SelectGroup key={region.state}>
                    <SelectLabel className="text-[11px] uppercase tracking-wide">
                      {region.state}
                    </SelectLabel>
                    <SelectItem value={`state:${region.state}`} className="font-medium">
                      All of {region.state} ({region.cities.length} cities)
                    </SelectItem>
                    {region.cities.map((city) => (
                      <SelectItem key={city} value={city} className="pl-6">
                        {city}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 rounded-xl bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 rounded-xl bg-background"
            />
          </div>
        </div>
      </div>

      {isPending || isCountryLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Updating {country.name} data…
        </div>
      ) : null}

      {!metricsReady ? (
        <LoadingSpinner className="py-16" text={`Loading ${country.name} dashboard...`} />
      ) : (
      <>
          {/* Section 2 — KPI Cards */}
          <section className="space-y-4">
            <SectionHeader
              title="Key metrics"
              description={`Live snapshot · ${PERIOD_LABELS[period]}`}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <MetricCard
                title="Total Users"
                value={data.stats.totalUsers}
                numericValue={data.stats.totalUsers}
                icon={Users}
                delay={0}
                accent="teal"
                href="/users"
              />
              <MetricCard
                title="Providers"
                value={data.stats.totalProviders}
                numericValue={data.stats.totalProviders}
                icon={Briefcase}
                delay={1}
                accent="green"
                href="/providers"
              />
              <MetricCard
                title="Pending Verification"
                value={data.stats.pendingVerification}
                numericValue={data.stats.pendingVerification}
                icon={ShieldAlert}
                delay={2}
                accent="amber"
                href="/verification"
              />
              <MetricCard
                title="Active Bookings"
                value={data.stats.activeBookings}
                numericValue={data.stats.activeBookings}
                icon={CalendarCheck}
                delay={3}
                accent="teal"
                href="/bookings"
              />
              <MetricCard
                title="Revenue Today"
                value={fmt(data.stats.revenueToday)}
                icon={DollarSign}
                delay={4}
                accent="green"
                href="/analytics?period=day"
                animate={false}
              />
              <MetricCard
                title={`Revenue · ${PERIOD_LABELS[period]}`}
                value={fmt(data.stats.revenueMonth)}
                icon={TrendingUp}
                delay={5}
                accent="teal"
                href={`/analytics?period=${period}`}
                animate={false}
              />
            </div>
          </section>

          {operationalKpis && (
            <section className="space-y-4">
              <SectionHeader
                title="Operational KPIs"
                description="Live marketplace performance indicators"
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Avg Response Time"
                  value={`${operationalKpis.avgResponseTimeMinutes}m`}
                  icon={Zap}
                  accent="teal"
                  animate={false}
                />
                <MetricCard
                  title="Avg Completion Time"
                  value={`${operationalKpis.avgCompletionTimeHours}h`}
                  icon={CalendarCheck}
                  accent="green"
                  animate={false}
                />
                <MetricCard
                  title="Daily Active Providers"
                  value={operationalKpis.dailyActiveProviders}
                  numericValue={operationalKpis.dailyActiveProviders}
                  icon={Briefcase}
                  accent="teal"
                />
                <MetricCard
                  title="Provider Utilization"
                  value={`${Math.round(operationalKpis.providerUtilization * 100)}%`}
                  icon={TrendingUp}
                  accent="green"
                  animate={false}
                />
                <MetricCard
                  title="Revenue / Provider"
                  value={fmt(operationalKpis.revenuePerProvider)}
                  icon={DollarSign}
                  accent="teal"
                  animate={false}
                />
                <MetricCard
                  title="Booking Success Rate"
                  value={`${Math.round(operationalKpis.bookingSuccessRate * 100)}%`}
                  icon={CalendarCheck}
                  accent="green"
                  animate={false}
                />
                <MetricCard
                  title="Verification Turnaround"
                  value={`${operationalKpis.verificationTurnaroundDays}d`}
                  icon={ShieldAlert}
                  accent="amber"
                  animate={false}
                />
                <MetricCard
                  title="Customer Satisfaction"
                  value={`${operationalKpis.customerSatisfaction}★`}
                  icon={Sparkles}
                  accent="amber"
                  animate={false}
                />
              </div>
            </section>
          )}

          {/* Section 4 — Today's Operations */}
          <section className="space-y-4">
            <SectionHeader title="Today's operations" description="Items requiring your attention" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <ActionCard
                title="Pending Verifications"
                description="Providers awaiting review"
                count={opsSummary?.pendingVerification ?? data.stats.pendingVerification}
                icon={ShieldAlert}
                href="/verification"
                accent="warning"
                delay={0}
              />
              <ActionCard
                title="Active Bookings"
                description="In progress or pending"
                count={data.stats.activeBookings}
                icon={CalendarCheck}
                href="/bookings"
                accent="info"
                delay={1}
              />
              <ActionCard
                title="Pending Reviews"
                description="Completed, awaiting feedback"
                count={opsSummary?.pendingReviews ?? pendingBookings}
                icon={Zap}
                href="/bookings"
                accent="warning"
                delay={2}
              />
              <ActionCard
                title="Notifications"
                description="Unread in center"
                count={opsSummary?.unreadNotifications ?? "→"}
                icon={Bell}
                href="/notifications"
                accent="info"
                delay={3}
              />
              <ActionCard
                title="Rewards"
                description="Pending reward approvals"
                count={opsSummary?.pendingRewards ?? "→"}
                icon={Gift}
                href="/referrals"
                accent="success"
                delay={4}
              />
            </div>
          </section>

          {/* Section 3 — Analytics */}
          <section className="space-y-4">
            <SectionHeader
              title="Business analytics"
              description={`Performance · ${PERIOD_LABELS[period]}`}
            />
            <div className="grid gap-6 lg:grid-cols-12">
            {/* Revenue trend — full width on top row */}
            <ChartCard
              title={`Revenue Trend · ${PERIOD_LABELS[period]}`}
              className="lg:col-span-8"
              action={
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {chartData.length} data points
                </span>
              }
            >
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND_COLORS.primary} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={BRAND_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => fmt(v)}
                    />
                    <Tooltip
                      formatter={(value: number) => [fmt(value), "Revenue"]}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={BRAND_COLORS.primary}
                      strokeWidth={2.5}
                      fill="url(#dashRevenueGrad)"
                      dot={{ fill: BRAND_COLORS.primary, strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 6, fill: BRAND_COLORS.secondary }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-16 text-center text-muted-foreground">
                  No revenue data for selected filters
                </p>
              )}
            </ChartCard>

            {/* Booking status pie */}
            <ChartCard title="Bookings by Status" className="lg:col-span-4">
              {data.bookingStatus.length > 0 ? (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.bookingStatus}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        strokeWidth={0}
                      >
                        {data.bookingStatus.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value} (${totalStatus ? ((value / totalStatus) * 100).toFixed(0) : 0}%)`,
                          name,
                        ]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-xs text-muted-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-2xl font-bold">{totalStatus}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Total
                    </p>
                  </div>
                </div>
              ) : (
                <p className="py-16 text-center text-muted-foreground">No booking data yet</p>
              )}
            </ChartCard>

            {/* Service revenue bar */}
            <ChartCard title="Top Services by Revenue" className="lg:col-span-5">
              {data.serviceRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={data.serviceRevenue}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.4} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={18}>
                      {data.serviceRevenue.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-16 text-center text-muted-foreground">No service data yet</p>
              )}
            </ChartCard>

            {/* Category revenue bar */}
            <ChartCard title="Revenue by Category" className="lg:col-span-7">
              {data.categoryRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.categoryRevenue} margin={{ top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => fmt(v)}
                    />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="revenue" radius={[8, 8, 0, 0]} barSize={32}>
                      {data.categoryRevenue.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-16 text-center text-muted-foreground">No category data yet</p>
              )}
            </ChartCard>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Section 5 — Recent Activity */}
            <section className="space-y-4">
              <SectionHeader
                title="Recent activity"
                description="Latest bookings in your region"
                action={
                  <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                    <Link href="/bookings">
                      View all
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                }
              />
              <GlassCard>
                <Timeline items={timelineItems} />
              </GlassCard>
            </section>

            {/* Section 6 — Business Insights */}
            <section className="space-y-4">
              <SectionHeader
                title="Business insights"
                description="Rule-based operational intelligence"
              />
              <div className="space-y-3">
                {ruleBasedInsights.length > 0
                  ? ruleBasedInsights.map((insight) => (
                      <GlassCard
                        key={insight.id}
                        hover
                        className="flex gap-3 border-primary/10 p-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#006F5F]/10">
                          <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{insight.title}</p>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {insight.description}
                          </p>
                          {insight.metric && (
                            <p className="mt-1 text-xs font-semibold text-primary">
                              {insight.metric}
                            </p>
                          )}
                        </div>
                      </GlassCard>
                    ))
                  : insights.map((text, i) => (
                      <GlassCard
                        key={i}
                        hover
                        className="flex gap-3 border-dashed border-primary/20 p-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#006F5F]/10">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                      </GlassCard>
                    ))}
              </div>
            </section>
          </div>

          <DeferredMount delayMs={1200}>
            <PlatformHealthWidget className="mt-2" />
          </DeferredMount>

          {isReady && (
            <section className="space-y-4">
              <DeferredMount delayMs={1500}>
                <AIBusinessAdvisorWidget countryCode={countryCode} />
              </DeferredMount>
            </section>
          )}

          {/* Recent bookings table — preserved */}
          <section>
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Recent Bookings</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {country.flag} {country.name} · Latest {data.recentBookings.length} records
                </p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
                <Link href="/bookings">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {data.recentBookings.length > 0 ? (
                <div className="divide-y divide-border/40 rounded-xl border border-border/40">
                  {data.recentBookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/bookings?q=${encodeURIComponent(booking.bookingNumber)}`}
                      className="flex items-center justify-between gap-4 p-4 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                          {booking.bookingNumber.slice(-3)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{booking.bookingNumber}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {booking.serviceName} · {booking.provider.businessName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(booking.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-primary">{fmt(booking.amount)}</p>
                        <StatusBadge status={booking.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-12 text-center text-muted-foreground">
                  No bookings in {country.name} yet
                </p>
              )}
            </CardContent>
          </Card>
          </section>
        </>
      )}
    </div>
  );
}
