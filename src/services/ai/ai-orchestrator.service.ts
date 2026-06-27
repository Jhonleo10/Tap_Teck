import type { AIIntelligencePayload } from "@/lib/ai/types";
import { getAIProvider, getActiveAIProviderName } from "@/lib/ai/registry";
import { buildAnalyticsSnapshot } from "@/services/analytics/analytics-engine.service";
import { calculateBusinessHealth } from "@/services/insights/business-health.service";
import {
  buildTrendCards,
  buildDailyBriefing,
  buildWeeklyReport,
  buildReviewIntelligence,
  buildProviderIntelligence,
  buildCustomerIntelligence,
  buildRevenueIntelligence,
  buildOperationalIntelligence,
} from "@/services/insights/intelligence-modules.service";

export async function getAIIntelligence(country: string): Promise<AIIntelligencePayload> {
  const analytics = await buildAnalyticsSnapshot(country);
  const provider = getAIProvider();
  const ctx = { country, analytics };

  const [
    advisorInsights,
    recommendations,
    alerts,
    predictions,
    reviewIntelligence,
    providerIntelligence,
    customerIntelligence,
    weeklyReport,
  ] = await Promise.all([
    Promise.resolve(provider.generateInsights(ctx)),
    Promise.resolve(provider.generateRecommendations(ctx)),
    Promise.resolve(provider.generateAlerts(ctx)),
    Promise.resolve(provider.generatePredictions(ctx)),
    buildReviewIntelligence(country),
    buildProviderIntelligence(analytics),
    buildCustomerIntelligence(country),
    buildWeeklyReport(analytics),
  ]);

  const businessHealth = calculateBusinessHealth(analytics);
  const operationalIntelligence = buildOperationalIntelligence(analytics, alerts);

  return {
    generatedAt: analytics.generatedAt.toISOString(),
    country,
    provider: getActiveAIProviderName(),
    advisorInsights,
    recommendations,
    alerts,
    dailyBriefing: buildDailyBriefing(analytics),
    weeklyReport,
    businessHealth,
    trends: buildTrendCards(analytics),
    predictions,
    reviewIntelligence,
    providerIntelligence,
    customerIntelligence,
    revenueIntelligence: buildRevenueIntelligence(analytics),
    operationalIntelligence,
  };
}
