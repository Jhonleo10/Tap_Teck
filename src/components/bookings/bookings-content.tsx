"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Star, CalendarCheck, IndianRupee, MessageSquare } from "lucide-react";
import {
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
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard, CHART_COLORS } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { ExportButtons } from "@/components/shared/export-buttons";
import { ListFilterBar } from "@/components/shared/list-filter-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateBookingStatus, getBookings } from "@/actions/bookings";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCountry } from "@/components/providers/country-provider";
import {
  getCountrySubServiceOptions,
  getCountryServicesByCategory,
} from "@/lib/catalog";
import type { BookingStatus } from "@prisma/client";

type BookingRow = {
  id: string;
  bookingNumber: string;
  serviceName: string;
  subServiceName: string | null;
  location: string;
  amount: number;
  status: BookingStatus;
  createdAt: Date;
  user: { name: string | null; email: string };
  provider: { businessName: string };
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user: { name: string | null; email: string };
  provider: { businessName: string };
  booking: { bookingNumber: string; serviceName: string };
};

export function BookingsContent({
  bookings,
  reviews,
}: {
  bookings: BookingRow[];
  reviews: ReviewRow[];
}) {
  const { countryCode, country, services, isReady } = useCountry();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [bookingData, setBookingData] = useState(bookings);
  const [reviewData] = useState(reviews);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [subServiceFilter, setSubServiceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, startTransition] = useTransition();

  const subServiceOptions = useMemo(
    () => getCountrySubServiceOptions(countryCode, serviceFilter),
    [countryCode, serviceFilter]
  );

  const filteredBookings = useMemo(() => {
    return bookingData.filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) return false;
      if (serviceFilter !== "all" && booking.serviceName !== serviceFilter) return false;
      if (subServiceFilter !== "all" && booking.subServiceName !== subServiceFilter) return false;
      return true;
    });
  }, [bookingData, statusFilter, serviceFilter, subServiceFilter]);

  useEffect(() => {
    if (!isReady) return;
    startTransition(async () => {
      const data = await getBookings({ country: countryCode });
      setBookingData(data as BookingRow[]);
    });
    setServiceFilter("all");
    setSubServiceFilter("all");
    setStatusFilter("all");
  }, [countryCode, isReady]);

  const handleBookingStatus = async (id: string, status: BookingStatus) => {
    await updateBookingStatus(id, status);
    setBookingData((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
    toast.success("Booking status updated");
  };

  const filteredReviews =
    ratingFilter === "all"
      ? reviewData
      : reviewData.filter((r) => r.rating === parseInt(ratingFilter));

  const statusChart = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBookings.forEach((b) => {
      const key = b.status.replace("_", " ");
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredBookings]);

  const ratingChart = useMemo(() => {
    const counts = [1, 2, 3, 4, 5].map((r) => ({
      rating: `${r}★`,
      count: reviewData.filter((rev) => rev.rating === r).length,
    }));
    return counts;
  }, [reviewData]);

  const totalRevenue = filteredBookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + b.amount, 0);
  const avgRating =
    reviewData.length > 0
      ? (reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length).toFixed(1)
      : "—";

  const bookingColumns: ColumnDef<BookingRow>[] = [
    { accessorKey: "bookingNumber", header: "Booking #" },
    {
      accessorKey: "serviceName",
      header: "Service",
      cell: ({ row }) => (
        <div>
          <p>{row.original.serviceName}</p>
          {row.original.subServiceName && (
            <p className="text-xs text-muted-foreground">{row.original.subServiceName}</p>
          )}
          <p className="text-xs text-muted-foreground">{row.original.location}</p>
        </div>
      ),
    },
    {
      accessorKey: "user",
      header: "Customer",
      cell: ({ row }) => row.original.user.name ?? row.original.user.email,
    },
    {
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }) => row.original.provider.businessName,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onValueChange={(v) => handleBookingStatus(row.original.id, v as BookingStatus)}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  const reviewColumns: ColumnDef<ReviewRow>[] = [
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < row.original.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
            />
          ))}
        </div>
      ),
    },
    {
      accessorKey: "comment",
      header: "Feedback",
      cell: ({ row }) => row.original.comment ?? "—",
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => row.original.user.name ?? row.original.user.email,
    },
    {
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }) => row.original.provider.businessName,
    },
    {
      accessorKey: "booking",
      header: "Booking",
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.booking.bookingNumber}</p>
          <p className="text-xs text-muted-foreground">{row.original.booking.serviceName}</p>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  const resetBookingFilters = () => {
    setServiceFilter("all");
    setSubServiceFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings & Reviews" description={`${country.flag} ${country.name} — Track bookings across ${services.length} TapTeck services`} badge="Operations">
        <ExportButtons
          data={filteredBookings.map((b) => ({
            bookingNumber: b.bookingNumber,
            service: b.serviceName,
            subService: b.subServiceName ?? "",
            customer: b.user.name ?? b.user.email,
            provider: b.provider.businessName,
            amount: b.amount,
            status: b.status,
          }))}
          filename="bookings"
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Bookings" value={filteredBookings.length} icon={CalendarCheck} accent="teal" />
        <StatCard title="Completed Revenue" value={formatCurrency(totalRevenue)} icon={IndianRupee} accent="emerald" />
        <StatCard title="Total Reviews" value={reviewData.length} icon={MessageSquare} accent="blue" />
        <StatCard title="Avg Rating" value={avgRating} icon={Star} accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Bookings by Status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusChart}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {statusChart.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Review Rating Distribution">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ratingChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#006F5F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Bookings ({filteredBookings.length})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviewData.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4 space-y-4">
          <ListFilterBar
            description={`${services.length} services · ${getCountryServicesByCategory(countryCode, "all").reduce((n, s) => n + (s.subServices?.length ?? 1), 0)} bookable options`}
            resultCount={filteredBookings.length}
            onReset={resetBookingFilters}
            filters={[
              {
                id: "status",
                label: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "all", label: "All Statuses" },
                  { value: "PENDING", label: "Pending" },
                  { value: "CONFIRMED", label: "Confirmed" },
                  { value: "IN_PROGRESS", label: "In Progress" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "CANCELLED", label: "Cancelled" },
                ],
              },
              {
                id: "service",
                label: "Service",
                value: serviceFilter,
                onChange: (value) => {
                  setServiceFilter(value);
                  setSubServiceFilter("all");
                },
                options: [
                  { value: "all", label: "All Services" },
                  ...services.map((s) => ({ value: s.title, label: s.title })),
                ],
              },
              {
                id: "subService",
                label: "Sub-Service",
                value: subServiceFilter,
                onChange: setSubServiceFilter,
                options: [
                  { value: "all", label: "All Sub-Services" },
                  ...subServiceOptions.map((sub) => ({ value: sub, label: sub })),
                ],
              },
            ]}
          />
          <DataTable
            columns={bookingColumns}
            data={filteredBookings}
            searchKeys={["bookingNumber", "serviceName", "subServiceName", "location"]}
            searchPlaceholder="Search bookings..."
            defaultSearch={initialSearch}
            defaultSorting={[{ id: "createdAt", desc: true }]}
          />
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-4">
          <div className="flex gap-2">
            {["all", "1", "2", "3", "4", "5"].map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  ratingFilter === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {r === "all" ? "All" : `${r} Star`}
              </button>
            ))}
          </div>
          <DataTable
            columns={reviewColumns}
            data={filteredReviews}
            searchKeys={["comment", "user.name", "user.email", "provider.businessName"]}
            searchPlaceholder="Search reviews..."
            defaultSorting={[{ id: "createdAt", desc: true }]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
