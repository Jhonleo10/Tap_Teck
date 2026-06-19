import { getVerificationProviders } from "@/actions/verification";
import { VerificationContent } from "@/components/verification/verification-content";

export default async function VerificationPage() {
  const data = await getVerificationProviders({ page: 1, pageSize: 5 });

  return <VerificationContent initialData={data} />;
}
