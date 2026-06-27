"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Star, CalendarCheck, IndianRupee, MessageSquare, Eye, Flag, Trash2 } from "lucide-react";
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
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ListFilterBar } from "@/components/shared/list-filter-bar";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateBookingStatus, getBookings } from "@/actions/bookings";
import { getReviews } from "@/actions/reviews";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EMPTY_DATE_RANGE, hasActiveDateRange, isWithinDateRange, type DateRange } from "@/lib/date-filters";
import { useCountry } from "@/components/providers/country-provider";
import {
  getCountrySubServiceOptions,
  getCountryServicesByCategory,
} from "@/lib/catalog";
import type { BookingStatus } from "@prisma/client";
import { BookingOperationsDrawer } from "@/components/operations/booking-operations-drawer";
import { BookingAnalyticsStrip } from "@/components/operations/booking-analytics-strip";
import {
  ReviewIntelligencePanel,
  reviewAdminActions,
} from "@/components/operations/review-intelligence-panel";
import { Button } from "@/components/ui/button";

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
  initialBookings,
  initialReviews,
}: {
  initialBookings: import("@/lib/pagination").PaginatedResult<BookingRow>;
  initialReviews: import("@/lib/pagination").PaginatedResult<ReviewRow>;
}) {
  const { countryCode, country, services, isReady } = useCountry();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [bookingsPage, setBookingsPage] = useState(initialBookings);
  const [reviewsPage, setReviewsPage] = useState(initialReviews);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [subServiceFilter, setSubServiceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bookingDateRange, setBookingDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [reviewDateRange, setReviewDateRange] = useState<DateRange>(EMPTY_DATE_RANGE);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [, startTransition] = useTransition();

  const subServiceOptions = useMemo(
    () => getCountrySubServiceOptions(countryCode, serviceFilter),
    [countryCode, serviceFilter]
  );

  const bookingData = bookingsPage.items;
  const reviewData = reviewsPage.items;

  const filteredBookings = useMemo(() => {
    return bookingData.filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) return false;
      if (serviceFilter !== "all" && booking.serviceName !== serviceFilter) return false;
      if (subServiceFilter !== "all" && booking.subServiceName !== subServiceFilter) return false;
      if (!isWithinDateRange(booking.createdAt, bookingDateRange)) return false;
      return true;
    });
  }, [bookingData, statusFilter, serviceFilter, subServiceFilter, bookingDateRange]);

  useEffect(() => {
    if (!isReady) return;
    startTransition(async () => {
      const result = await getBookings({ country: countryCode, page: 1, pageSize: bookingsPage.pageSize });
      if (result.success && result.data) {
        setBookingsPage(result.data);
      }
    });
    setServiceFilter("all");
    setSubServiceFilter("all");
    setStatusFilter("all");
    setBookingDateRange(EMPTY_DATE_RANGE);
  }, [countryCode, isReady, bookingsPage.pageSize]);

  const loadBookingsPage = (page: number, pageSize = bookingsPage.pageSize) => {
    startTransition(async () => {
      const result = await getBookings({
        country: countryCode,
        status: statusFilter === "all" ? "ALL" : (statusFilter as BookingStatus),
        service: serviceFilter,
        subService: subServiceFilter,
        dateFrom: bookingDateRange.from || undefined,
        dateTo: bookingDateRange.to || undefined,
        page,
        pageSize,
      });
      if (result.success && result.data) {
        setBookingsPage(result.data);
      }
    });
  };

  const handleBookingStatus = async (id: string, status: BookingStatus) => {
    const result = await updateBookingStatus(id, status);
    if (!result.success) {
      toast.error(result.error ?? "Failed to update booking");
      return;
    }
    setBookingsPage((prev) => ({
      ...prev,
      items: prev.items.map((b) => (b.id === id ? { ...b, status } : b)),
    }));
    toast.success("Booking status updated");
  };

  const filteredReviews = useMemo(() => {
    const list = ratingFilter === "all"
      ? reviewData
      : reviewData.filter((r) => r.rating === parseInt(ratingFilter));
    return list.filter((r) => isWithinDateRange(r.createdAt, reviewDateRange));
  }, [reviewData, ratingFilter, reviewDateRange]);

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
    {
      id: "bookingActions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          onClick={() => {
            setSelectedBookingId(row.original.id);
            setBookingDrawerOpen(true);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
      ),
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
    {
      id: "reviewActions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Flag review"
            onClick={() =>
              reviewAdminActions(row.original.id, "flag")
            }
          >
            <Flag className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            title="Delete review"
            onClick={() =>
              reviewAdminActions(row.original.id, "delete", () => {
                setReviewsPage((prev) => ({
                  ...prev,
                  items: prev.items.filter((r) => r.id !== row.original.id),
                  total: prev.total - 1,
                }));
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const resetBookingFilters = () => {
    setServiceFilter("all");
    setSubServiceFilter("all");
    setStatusFilter("all");
    setBookingDateRange(EMPTY_DATE_RANGE);
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
          showPdf
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Bookings" value={bookingsPage.total} icon={CalendarCheck} accent="teal" />
        <StatCard title="Completed Revenue" value={formatCurrency(totalRevenue)} icon={IndianRupee} accent="emerald" />
        <StatCard title="Total Reviews" value={reviewsPage.total} icon={MessageSquare} accent="blue" />
        <StatCard title="Avg Rating" value={avgRating} icon={Star} accent="amber" />
      </div>

      {isReady && <BookingAnalyticsStrip countryCode={countryCode} />}

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
          <TabsTrigger value="bookings">Bookings ({bookingsPage.total})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviewsPage.total})</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4 space-y-4">
          <ListFilterBar
            description={`${services.length} services · ${getCountryServicesByCategory(countryCode, "all").reduce((n, s) => n + (s.subServices?.length ?? 1), 0)} bookable options`}
            resultCount={filteredBookings.length}
            onReset={resetBookingFilters}
            hasExtraFilters={hasActiveDateRange(bookingDateRange)}
            extra={
              <DateRangeFilter
                value={bookingDateRange}
                onChange={setBookingDateRange}
                label="Booking date"
              />
            }
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
            onApply={() => loadBookingsPage(1)}
          />
          <DataTable
            columns={bookingColumns}
            data={filteredBookings}
            searchKeys={["bookingNumber", "serviceName", "subServiceName", "location"]}
            searchPlaceholder="Search bookings..."
            defaultSearch={initialSearch}
            defaultSorting={[{ id: "createdAt", desc: true }]}
            showPagination={false}
          />
          <PaginationControls
            page={bookingsPage.page}
            pageSize={bookingsPage.pageSize}
            total={bookingsPage.total}
            onPageChange={(p) => loadBookingsPage(p)}
            onPageSizeChange={(size) => loadBookingsPage(1, size)}
          />
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-4">
          {isReady && <ReviewIntelligencePanel countryCode={countryCode} />}
          <ListFilterBar
            description="Filter reviews by rating and date"
            resultCount={filteredReviews.length}
            onReset={() => {
              setRatingFilter("all");
              setReviewDateRange(EMPTY_DATE_RANGE);
            }}
            hasExtraFilters={hasActiveDateRange(reviewDateRange) || ratingFilter !== "all"}
            extra={
              <DateRangeFilter
                value={reviewDateRange}
                onChange={setReviewDateRange}
                label="Review date"
              />
            }
            filters={[
              {
                id: "rating",
                label: "Rating",
                value: ratingFilter,
                onChange: setRatingFilter,
                options: [
                  { value: "all", label: "All Ratings" },
                  { value: "5", label: "5 Stars" },
                  { value: "4", label: "4 Stars" },
                  { value: "3", label: "3 Stars" },
                  { value: "2", label: "2 Stars" },
                  { value: "1", label: "1 Star" },
                ],
              },
            ]}
          />
          <DataTable
            columns={reviewColumns}
            data={filteredReviews}
            searchKeys={["comment", "user.name", "user.email", "provider.businessName"]}
            searchPlaceholder="Search reviews..."
            defaultSorting={[{ id: "createdAt", desc: true }]}
            showPagination={false}
          />
          <PaginationControls
            page={reviewsPage.page}
            pageSize={reviewsPage.pageSize}
            total={reviewsPage.total}
            onPageChange={(p) => {
              startTransition(async () => {
                const result = await getReviews({
                  rating: ratingFilter === "all" ? "ALL" : parseInt(ratingFilter),
                  dateFrom: reviewDateRange.from || undefined,
                  dateTo: reviewDateRange.to || undefined,
                  page: p,
                  pageSize: reviewsPage.pageSize,
                });
                if (result.success && result.data) setReviewsPage(result.data);
              });
            }}
            onPageSizeChange={(size) => {
              startTransition(async () => {
                const result = await getReviews({
                  rating: ratingFilter === "all" ? "ALL" : parseInt(ratingFilter),
                  page: 1,
                  pageSize: size,
                });
                if (result.success && result.data) setReviewsPage(result.data);
              });
            }}
          />
        </TabsContent>
      </Tabs>

      <BookingOperationsDrawer
        bookingId={selectedBookingId}
        open={bookingDrawerOpen}
        onOpenChange={setBookingDrawerOpen}
      />
    </div>
  );
}
