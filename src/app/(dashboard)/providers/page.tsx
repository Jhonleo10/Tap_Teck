import { getProviders } from "@/actions/providers";
import { ProvidersContent } from "@/components/providers/providers-content";

export default async function ProvidersPage() {
  const providers = await getProviders();
  return <ProvidersContent providers={providers} />;
}
