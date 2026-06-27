import { getReferrals, getRewards, getTopPerformers } from "@/actions/referrals";
import { ReferralsContent } from "@/components/referrals/referrals-content";
import { ErrorCard } from "@/components/shared/error-card";
import { auth } from "@/lib/auth";

export default async function ReferralsPage() {
  const session = await auth();
  const [referralsResult, rewardsResult, performersResult] = await Promise.all([
    getReferrals({ page: 1, pageSize: 10 }),
    getRewards({ page: 1, pageSize: 10 }),
    getTopPerformers(),
  ]);

  if (
    !referralsResult.success ||
    !rewardsResult.success ||
    !performersResult.success
  ) {
    return (
      <ErrorCard
        message={
          referralsResult.error ??
          rewardsResult.error ??
          performersResult.error ??
          "Failed to load referrals"
        }
      />
    );
  }

  return (
    <ReferralsContent
      initialReferrals={referralsResult.data!}
      initialRewards={rewardsResult.data!}
      performers={performersResult.data!}
      adminId={session?.user?.id ?? ""}
    />
  );
}
