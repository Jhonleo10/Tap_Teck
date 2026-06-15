"use client";

import { useState, useTransition } from "react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { getAnalyticsData } from "@/actions/analytics";
import { formatCurrency } from "@/lib/utils";
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
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [service, setService] = useState<string>("all");
  const [location, setLocation] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const fetchData = (
    p: typeof period,
    s: string,
    l: string
  ) => {
    startTransition(async () => {
      const result = await getAnalyticsData(
        p,
        s === "all" ? undefined : s,
        l === "all" ? undefined : l
      );
      setData(result);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Business Analytics" description="Revenue, bookings, and performance across all service categories" badge="Insights">
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
              {filterOptions.services.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={location}
            onValueChange={(v) => {
              setLocation(v);
              fetchData(period, service, v);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {filterOptions.locations.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
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
              value={formatCurrency(data.totalRevenue)}
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
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
                    <span className="font-semibold">{formatCurrency(s.revenue)}</span>
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
