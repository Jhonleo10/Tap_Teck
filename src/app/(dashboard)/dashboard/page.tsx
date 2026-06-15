import {
  getDashboardStats,
  getRecentBookings,
  getRevenueTrend,
  getBookingStatusBreakdown,
  getCategoryRevenue,
} from "@/actions/dashboard";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const [stats, recentBookings, revenueTrend, bookingStatus, categoryRevenue] =
    await Promise.all([
      getDashboardStats(),
      getRecentBookings(5),
      getRevenueTrend(7),
      getBookingStatusBreakdown(),
      getCategoryRevenue(),
    ]);

  return (
    <DashboardContent
      stats={stats}
      recentBookings={recentBookings}
      revenueTrend={revenueTrend}
      bookingStatus={bookingStatus}
      categoryRevenue={categoryRevenue}
    />
  );
}
