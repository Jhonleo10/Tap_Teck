"use server";

import { withAction } from "@/lib/action-response";
import { getProviderOperationsProfile } from "@/services/provider-operations.service";
import {
  getBookingOperationsDetail,
  getBookingAnalytics,
} from "@/services/booking-operations.service";
import { getReviewIntelligence } from "@/services/review-intelligence.service";
import {
  getOperationsSummary,
  getOperationalKPIs,
  generateBusinessInsights,
} from "@/services/business-insights.service";
import { getPlatformHealth } from "@/services/platform-health.service";
import {
  getRewardLeaderboard,
  getReferralOperationsStats,
  computeMonthlyLeaderboard,
} from "@/services/referral-rewards.service";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import type { ActionResponse } from "@/types/action";

export async function fetchProviderOperations(providerId: string) {
  return withAction(
    () => getProviderOperationsProfile(providerId),
    "fetchProviderOperations"
  );
}

export async function fetchBookingOperations(bookingId: string) {
  return withAction(
    () => getBookingOperationsDetail(bookingId),
    "fetchBookingOperations"
  );
}

export async function fetchBookingAnalytics(country?: string) {
  return withAction(() => getBookingAnalytics(country), "fetchBookingAnalytics");
}

export async function fetchReviewIntelligence(country?: string) {
  return withAction(() => getReviewIntelligence(country), "fetchReviewIntelligence");
}

export async function fetchOperationsSummary(country: string) {
  return withAction(() => getOperationsSummary(country), "fetchOperationsSummary");
}

export async function fetchOperationalKPIs(country: string) {
  return withAction(() => getOperationalKPIs(country), "fetchOperationalKPIs");
}

export async function fetchBusinessInsights(country: string) {
  return withAction(() => generateBusinessInsights(country), "fetchBusinessInsights");
}

export async function fetchPlatformHealth() {
  return withAction(() => getPlatformHealth(), "fetchPlatformHealth");
}

export async function fetchRewardLeaderboard(country?: string) {
  return withAction(() => getRewardLeaderboard(country), "fetchRewardLeaderboard");
}

export async function fetchReferralOperations() {
  return withAction(() => getReferralOperationsStats(), "fetchReferralOperations");
}

export async function fetchMonthlyLeaderboard(country?: string) {
  return withAction(() => computeMonthlyLeaderboard(country), "fetchMonthlyLeaderboard");
}

export async function flagReview(
  reviewId: string,
  reason: string
): Promise<ActionResponse> {
  return withAction(async () => {
    const session = await auth();
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, providerId: true },
    });
    if (!review) throw new Error("Review not found");

    await createAuditLog({
      action: "REVIEW_FLAGGED",
      entityType: "Review",
      entityId: reviewId,
      adminId: session?.user?.id,
      adminName: session?.user?.name ?? undefined,
      metadata: { reason, flaggedAt: new Date().toISOString() },
    });
    revalidatePath("/bookings");
    return undefined;
  }, "flagReview", "Review flagged for review");
}

export async function deleteReview(reviewId: string): Promise<ActionResponse> {
  return withAction(async () => {
    const session = await auth();
    await createAuditLog({
      action: "REVIEW_DELETED",
      entityType: "Review",
      entityId: reviewId,
      adminId: session?.user?.id,
      adminName: session?.user?.name ?? undefined,
    });
    await prisma.review.delete({ where: { id: reviewId } });
    revalidatePath("/bookings");
    return undefined;
  }, "deleteReview", "Review removed");
}

export async function updateRewardStatus(
  rewardId: string,
  status: "ACTIVE" | "CLAIMED" | "EXPIRED"
): Promise<ActionResponse> {
  return withAction(async () => {
    const session = await auth();
    await prisma.reward.update({
      where: { id: rewardId },
      data: { status },
    });
    await createAuditLog({
      action: `REWARD_${status}`,
      entityType: "Reward",
      entityId: rewardId,
      adminId: session?.user?.id,
      adminName: session?.user?.name ?? undefined,
    });
    revalidatePath("/referrals");
    return undefined;
  }, "updateRewardStatus", "Reward status updated");
}

export async function fetchAuditTimeline(params?: {
  entityType?: string;
  limit?: number;
}) {
  return withAction(async () => {
    const logs = await prisma.auditLog.findMany({
      where: params?.entityType ? { entityType: params.entityType } : undefined,
      orderBy: { createdAt: "desc" },
      take: params?.limit ?? 50,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        adminName: true,
        metadata: true,
        createdAt: true,
      },
    });
    return logs;
  }, "fetchAuditTimeline");
}
