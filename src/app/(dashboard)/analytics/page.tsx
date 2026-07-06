import { Suspense } from "react";
import { getAnalyticsData } from "@/actions/analytics";
import { AnalyticsContent } from "@/components/analytics/analytics-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default async function AnalyticsPage() {
  const analytics = await getAnalyticsData("month");

  return (
    <Suspense fallback={<LoadingSpinner className="py-24" text="Loading analytics..." />}>
      <AnalyticsContent initialData={analytics} />
    </Suspense>
  );
}
