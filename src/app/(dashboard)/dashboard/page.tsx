import { getDashboardData } from "@/actions/dashboard";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DEFAULT_COUNTRY } from "@/lib/countries";

export default async function DashboardPage() {
  const initialData = await getDashboardData({
    country: DEFAULT_COUNTRY,
    period: "month",
  });

  return <DashboardContent initialData={initialData} />;
}
