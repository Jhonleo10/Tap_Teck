"use client";

import {
  Users,
  Briefcase,
  ShieldAlert,
  CalendarCheck,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { ChartCard, CHART_COLORS } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface DashboardContentProps {
  stats: {
    totalUsers: number;
    totalProviders: number;
    pendingVerification: number;
    activeBookings: number;
    revenueToday: number;
    revenueMonth: number;
  };
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    serviceName: string;
    amount: number;
    status: string;
    createdAt: Date;
    user: { name: string | null; email: string };
    provider: { businessName: string };
  }>;
  revenueTrend: Array<{ date: string; revenue: number }>;
  bookingStatus: Array<{ name: string; value: number }>;
  categoryRevenue: Array<{ name: string; revenue: number }>;
}

export function DashboardContent({
  stats,
  recentBookings,
  revenueTrend,
  bookingStatus,
  categoryRevenue,
}: DashboardContentProps) {
  const chartData = revenueTrend.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    revenue: d.revenue,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of users, providers, bookings, and revenue across all TapTeck services"
        badge="Live Overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          delay={0}
          accent="teal"
        />
        <StatCard
          title="Total Providers"
          value={stats.totalProviders}
          icon={Briefcase}
          delay={1}
          accent="emerald"
        />
        <StatCard
          title="Pending Verification"
          value={stats.pendingVerification}
          icon={ShieldAlert}
          delay={2}
          accent="amber"
        />
        <StatCard
          title="Active Bookings"
          value={stats.activeBookings}
          icon={CalendarCheck}
          delay={3}
          accent="blue"
        />
        <StatCard
          title="Revenue Today"
          value={formatCurrency(stats.revenueToday)}
          icon={IndianRupee}
          delay={4}
          accent="teal"
        />
        <StatCard
          title="Revenue This Month"
          value={formatCurrency(stats.revenueMonth)}
          icon={TrendingUp}
          delay={5}
          accent="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revenue Trend (7 Days)">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006F5F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#006F5F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "var(--muted-foreground)" }} />
                <YAxis className="text-xs" tick={{ fill: "var(--muted-foreground)" }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#006F5F"
                  strokeWidth={2.5}
                  dot={{ fill: "#006F5F", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "#0E8A72" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-muted-foreground">No revenue data yet</p>
          )}
        </ChartCard>

        <ChartCard title="Bookings by Status">
          {bookingStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={bookingStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {bookingStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-muted-foreground">No booking data yet</p>
          )}
        </ChartCard>

        <ChartCard title="Revenue by Category" className="lg:col-span-2">
          {categoryRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#006F5F" radius={[6, 6, 0, 0]}>
                  {categoryRevenue.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-muted-foreground">No category data yet</p>
          )}
        </ChartCard>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length > 0 ? (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {booking.bookingNumber.slice(-3)}
                    </div>
                    <div>
                      <p className="font-medium">{booking.bookingNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.serviceName} · {booking.provider.businessName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(booking.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{formatCurrency(booking.amount)}</p>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-muted-foreground">No bookings yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
