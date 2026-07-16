import { Suspense } from "react";
import { getProviderPricing, getProviderPricingStats } from "@/actions/provider-pricing";
import { ProviderPricingContent } from "@/components/provider-pricing/provider-pricing-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ErrorCard } from "@/components/shared/error-card";

export default async function ProviderPricingPage() {
  const [pricingResult, statsResult] = await Promise.all([
    getProviderPricing(),
    getProviderPricingStats(),
  ]);

  if (!pricingResult.success || !statsResult.success) {
    return (
      <ErrorCard
        message={pricingResult.error ?? statsResult.error ?? "Failed to load provider pricing"}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner className="py-24" />}>
      <ProviderPricingContent
        initialData={pricingResult.data!}
        initialStats={statsResult.data!}
      />
    </Suspense>
  );
}
