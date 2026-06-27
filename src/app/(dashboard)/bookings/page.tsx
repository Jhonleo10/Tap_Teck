import { Suspense } from "react";
import { getBookings } from "@/actions/bookings";
import { getReviews } from "@/actions/reviews";
import { BookingsContent } from "@/components/bookings/bookings-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RefreshErrorCard } from "@/components/shared/refresh-error-card";
export default async function BookingsPage() {
  const [bookingsResult, reviewsResult] = await Promise.all([
    getBookings({ page: 1, pageSize: 10 }),
    getReviews({ page: 1, pageSize: 10 }),
  ]);

  if (!bookingsResult.success || !reviewsResult.success) {
    return (
      <RefreshErrorCard
        title="Unable to load bookings"
        message={
          bookingsResult.error ?? reviewsResult.error ?? "Failed to load bookings"
        }
      />
    );
  }
  return (
    <Suspense fallback={<LoadingSpinner className="py-24" />}>
      <BookingsContent
        initialBookings={bookingsResult.data!}
        initialReviews={reviewsResult.data!}
      />
    </Suspense>
  );
}
