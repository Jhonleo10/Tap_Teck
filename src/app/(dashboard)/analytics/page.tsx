import { Suspense } from "react";
import { getAnalyticsData, getFilterOptions } from "@/actions/analytics";
import { AnalyticsContent } from "@/components/analytics/analytics-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default async function AnalyticsPage() {
  const [analytics, filters] = await Promise.all([
    getAnalyticsData("month"),
    getFilterOptions(),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner className="py-24" text="Loading analytics..." />}>
      <AnalyticsContent initialData={analytics} filterOptions={filters} />
    </Suspense>
  );
}
