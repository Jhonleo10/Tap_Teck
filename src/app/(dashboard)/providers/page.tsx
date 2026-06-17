import { Suspense } from "react";
import { getProviders } from "@/actions/providers";
import { ProvidersContent } from "@/components/providers/providers-content";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default async function ProvidersPage() {
  const providers = await getProviders();
  return (
    <Suspense fallback={<LoadingSpinner className="py-24" />}>
      <ProvidersContent providers={providers} />
    </Suspense>
  );
}
