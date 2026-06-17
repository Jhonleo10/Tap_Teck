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
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
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

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

interface DashboardContentProps {
  initialData: DashboardData;
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

export function DashboardContent({ initialData }: DashboardContentProps) {
  const { countryCode, country, services, isReady } = useCountry();
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [service, setService] = useState("all");
  const [location, setLocation] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPending, startTransition] = useTransition();

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
      });
    },
    [countryCode, period, service, location, dateFrom, dateTo]
  );

  useEffect(() => {
    if (!isReady) return;
    setService("all");
    setLocation("all");
    setDateFrom("");
    setDateTo("");
    fetchData({
      service: undefined,
      location: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  }, [countryCode, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = data.revenueTrend.map((d) => ({
    date: formatTrendDate(d.date, period),
    revenue: d.revenue,
  }));

  const totalStatus = data.bookingStatus.reduce((s, b) => s + b.value, 0);

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
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`${country.flag} ${country.name} — Overview of ${services.length} services, providers, bookings & revenue`}
        badge={`${country.name} · Live`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={period}
            onValueChange={(v) => {
              const p = v as DashboardPeriod;
              setPeriod(p);
              fetchData({ period: p });
            }}
          >
            <SelectTrigger className="h-9 w-[130px] rounded-xl border-border/60 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5" asChild>
            <Link href="/analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Filter bar */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Filter className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Filters</p>
              <p className="text-xs text-muted-foreground">
                {country.flag} {country.name} · {services.length} services available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      {isPending ? (
        <LoadingSpinner className="py-24" text={`Loading ${country.name} dashboard...`} />
      ) : (
        <>
          {/* Key metrics */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Key metrics
              </h2>
              <p className="text-xs text-muted-foreground">Click a card to open details</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title="Total Users"
                value={data.stats.totalUsers}
                icon={Users}
                delay={0}
                accent="teal"
                href="/users"
                hint="Manage users"
              />
              <StatCard
                title={`Providers in ${country.name}`}
                value={data.stats.totalProviders}
                icon={Briefcase}
                delay={1}
                accent="emerald"
                href="/providers"
                hint="View providers"
              />
              <StatCard
                title="Pending Verification"
                value={data.stats.pendingVerification}
                icon={ShieldAlert}
                delay={2}
                accent="amber"
                href="/verification"
                hint="Review queue"
              />
              <StatCard
                title="Active Bookings"
                value={data.stats.activeBookings}
                icon={CalendarCheck}
                delay={3}
                accent="blue"
                href="/bookings"
                hint="Open bookings"
              />
              <StatCard
                title="Revenue Today"
                value={fmt(data.stats.revenueToday)}
                icon={DollarSign}
                delay={4}
                accent="teal"
                href="/analytics?period=day"
                hint="Today's analytics"
              />
              <StatCard
                title={`Revenue · ${PERIOD_LABELS[period]}`}
                value={fmt(data.stats.revenueMonth)}
                icon={TrendingUp}
                delay={5}
                accent="emerald"
                href={`/analytics?period=${period}`}
                hint="Revenue insights"
              />
            </div>
          </section>

          {/* Charts */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Performance · {PERIOD_LABELS[period]}
            </h2>
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

          {/* Recent bookings */}
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
