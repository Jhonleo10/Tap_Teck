"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { ChartCard, CHART_COLORS } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { getAnalyticsData, getFilterOptions } from "@/actions/analytics";
import { formatCurrency } from "@/lib/utils";
import { useCountry } from "@/components/providers/country-provider";
import { getLocationDisplayLabel } from "@/lib/countries";
import { IndianRupee, CalendarCheck } from "lucide-react";

interface AnalyticsContentProps {
  initialData: Awaited<ReturnType<typeof getAnalyticsData>>;
  filterOptions: {
    services: string[];
    locations: string[];
    categories: string[];
  };
}

export function AnalyticsContent({ initialData, filterOptions }: AnalyticsContentProps) {
  const searchParams = useSearchParams();
  const urlPeriod = searchParams.get("period") as "day" | "week" | "month" | "year" | null;
  const { countryCode, country, services, isReady } = useCountry();
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState(filterOptions);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">(
    urlPeriod && ["day", "week", "month", "year"].includes(urlPeriod) ? urlPeriod : "month"
  );
  const [service, setService] = useState<string>("all");
  const [location, setLocation] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const fmt = useCallback(
    (amount: number) => formatCurrency(amount, country.currency, country.locale),
    [country]
  );

  const fetchData = useCallback(
    (p: typeof period, s: string, l: string, c = countryCode) => {
      startTransition(async () => {
        const [result, opts] = await Promise.all([
          getAnalyticsData(p, s === "all" ? undefined : s, l === "all" ? undefined : l, c),
          getFilterOptions(c),
        ]);
        setData(result);
        setFilters(opts);
      });
    },
    [countryCode]
  );

  useEffect(() => {
    if (!isReady) return;
    if (urlPeriod && ["day", "week", "month", "year"].includes(urlPeriod)) {
      fetchData(urlPeriod, "all", "all", countryCode);
      return;
    }
    setService("all");
    setLocation("all");
    fetchData(period, "all", "all", countryCode);
  }, [countryCode, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <PageHeader title="Business Analytics" description={`${country.flag} ${country.name} — Revenue, bookings, and performance across TapTeck services`} badge={`${country.name} Insights`}>
        <div className="flex flex-wrap gap-2">
          <Select
            value={period}
            onValueChange={(v) => {
              const p = v as typeof period;
              setPeriod(p);
              fetchData(p, service, location);
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={service}
            onValueChange={(v) => {
              setService(v);
              fetchData(period, v, location);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.title}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            key={countryCode}
            value={location}
            onValueChange={(v) => {
              setLocation(v);
              fetchData(period, service, v);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Location">
                {location === "all"
                  ? "All Locations"
                  : getLocationDisplayLabel(countryCode, location)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[min(20rem,70vh)] overflow-y-auto">
              <SelectItem value="all">All Locations</SelectItem>
              {country.regions.map((region) => (
                <SelectGroup key={region.state}>
                  <SelectLabel>{region.state}</SelectLabel>
                  <SelectItem value={`state:${region.state}`}>All of {region.state} ({region.cities.length})</SelectItem>
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
      </PageHeader>

      {isPending ? (
        <LoadingSpinner className="py-20" text="Loading analytics..." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Total Revenue"
              value={fmt(data.totalRevenue)}
              icon={IndianRupee}
              accent="teal"
            />
            <StatCard
              title="Total Bookings"
              value={data.totalBookings}
              icon={CalendarCheck}
              accent="emerald"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Revenue by Service">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.revenueByService.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="revenue" fill="#006F5F" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue by Location">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.revenueByLocation}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ name }) => name}
                  >
                    {data.revenueByLocation.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue by Category">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.revenueByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="revenue" fill="#0E8A72" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue Trend">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#006F5F"
                    strokeWidth={2.5}
                    dot={{ fill: "#006F5F", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card>
            <CardHeader><CardTitle>Top Performing Services</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topServices.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <span className="font-semibold">{fmt(s.revenue)}</span>
                  </div>
                ))}
                {data.topServices.length === 0 && (
                  <p className="py-8 text-center text-muted-foreground">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
