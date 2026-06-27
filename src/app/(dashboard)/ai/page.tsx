import { getAIIntelligence } from "@/services/ai/ai-orchestrator.service";
import { AIDashboardContent } from "@/components/ai/ai-dashboard-content";
import { DEFAULT_COUNTRY } from "@/lib/countries";

export default async function AIPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const initialData = await getAIIntelligence(DEFAULT_COUNTRY);

  return (
    <AIDashboardContent
      initialQuery={params.q ?? ""}
      initialData={initialData}
      serverCountry={DEFAULT_COUNTRY}
    />
  );
}
