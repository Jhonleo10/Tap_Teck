import { Suspense } from "react";
import { getBookings } from "@/actions/bookings";
import { getReviews } from "@/actions/reviews";
import { BookingsContent } from "@/components/bookings/bookings-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default async function BookingsPage() {
  const [bookings, reviews] = await Promise.all([getBookings(), getReviews()]);
  return (
    <Suspense fallback={<LoadingSpinner className="py-24" />}>
      <BookingsContent bookings={bookings} reviews={reviews} />
    </Suspense>
  );
}
