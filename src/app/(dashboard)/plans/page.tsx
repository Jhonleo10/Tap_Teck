import { Suspense } from "react";
import { getPlans, getPlanStats } from "@/actions/plans";
import { PlansContent } from "@/components/plans/plans-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ErrorCard } from "@/components/shared/error-card";

export default async function PlansPage() {
  const [plansResult, statsResult] = await Promise.all([
    getPlans(),
    getPlanStats(),
  ]);

  if (!plansResult.success || !statsResult.success) {
    return (
      <ErrorCard
        message={plansResult.error ?? statsResult.error ?? "Failed to load plans"}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner className="py-24" />}>
      <PlansContent
        initialPlans={plansResult.data!}
        initialStats={statsResult.data!}
      />
    </Suspense>
  );
}
