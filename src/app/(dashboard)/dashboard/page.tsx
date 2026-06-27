import { getDashboardData } from "@/actions/dashboard";
import { getOperationsSummary } from "@/services/business-insights.service";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DEFAULT_COUNTRY } from "@/lib/countries";

export default async function DashboardPage() {
  const [initialData, initialOpsSummary] = await Promise.all([
    getDashboardData({
      country: DEFAULT_COUNTRY,
      period: "month",
    }),
    getOperationsSummary(DEFAULT_COUNTRY),
  ]);

  return (
    <DashboardContent
      initialData={initialData}
      initialOpsSummary={initialOpsSummary}
      serverCountry={DEFAULT_COUNTRY}
    />
  );
}
