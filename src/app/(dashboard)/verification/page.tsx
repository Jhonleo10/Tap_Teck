import { getProvidersByVerification } from "@/actions/providers";
import { VerificationContent } from "@/components/verification/verification-content";

export default async function VerificationPage() {
  const providers = await getProvidersByVerification();
  return <VerificationContent providers={providers} />;
}
