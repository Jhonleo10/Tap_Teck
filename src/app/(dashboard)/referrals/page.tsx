import { getReferrals, getRewards, getTopPerformers } from "@/actions/referrals";
import { ReferralsContent } from "@/components/referrals/referrals-content";
import { auth } from "@/lib/auth";

export default async function ReferralsPage() {
  const session = await auth();
  const [referrals, rewards, performers] = await Promise.all([
    getReferrals(),
    getRewards(),
    getTopPerformers(),
  ]);

  return (
    <ReferralsContent
      referrals={referrals}
      rewards={rewards}
      performers={performers}
      adminId={session?.user?.id ?? ""}
    />
  );
}
