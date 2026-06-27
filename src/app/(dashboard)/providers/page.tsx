import { Suspense } from "react";
import { getProviders, getProviderStats } from "@/actions/providers";
import { ProvidersContent } from "@/components/providers/providers-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ErrorCard } from "@/components/shared/error-card";

export default async function ProvidersPage() {
  const [providersResult, statsResult] = await Promise.all([
    getProviders({ page: 1, pageSize: 10 }),
    getProviderStats(),
  ]);

  if (!providersResult.success || !statsResult.success) {
    return (
      <ErrorCard
        message={providersResult.error ?? statsResult.error ?? "Failed to load providers"}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner className="py-24" />}>
      <ProvidersContent
        initialData={providersResult.data!}
        initialStats={statsResult.data!}
      />
    </Suspense>
  );
}
