import { getAnalyticsData, getFilterOptions } from "@/actions/analytics";
import { AnalyticsContent } from "@/components/analytics/analytics-content";

export default async function AnalyticsPage() {
  const [analytics, filters] = await Promise.all([
    getAnalyticsData("month"),
    getFilterOptions(),
  ]);

  return (
    <AnalyticsContent
      initialData={analytics}
      filterOptions={filters}
    />
  );
}
