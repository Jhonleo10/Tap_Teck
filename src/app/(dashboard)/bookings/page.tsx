import { getBookings } from "@/actions/bookings";
import { getReviews } from "@/actions/reviews";
import { BookingsContent } from "@/components/bookings/bookings-content";

export default async function BookingsPage() {
  const [bookings, reviews] = await Promise.all([getBookings(), getReviews()]);
  return <BookingsContent bookings={bookings} reviews={reviews} />;
}
