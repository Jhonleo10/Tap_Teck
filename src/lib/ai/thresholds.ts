/**
 * Configurable business-rule thresholds.
 * Never hardcode magic numbers in rule logic — reference these values.
 */
export const AI_THRESHOLDS = {
  revenueGrowthPositive: 10,
  revenueGrowthNegative: -5,
  bookingGrowthPositive: 8,
  bookingGrowthNegative: -10,
  ratingWarning: 3,
  ratingGood: 4,
  pendingVerificationWarning: 15,
  pendingVerificationCritical: 25,
  cancellationRateWarning: 15,
  cancellationRateCritical: 25,
  negativeReviewSpike: 5,
  responseTimeWarningMinutes: 60,
  responseTimeCriticalMinutes: 120,
  referralGrowthPositive: 5,
  healthExcellent: 85,
  healthGood: 70,
  healthAverage: 55,
  healthNeedsAttention: 40,
  predictionConfidenceHigh: 85,
  predictionConfidenceMedium: 65,
  predictionConfidenceLow: 45,
  repeatCustomerMinBookings: 2,
  providerAtRiskCancellationRate: 20,
  providerAtRiskRating: 3.2,
} as const;

export type AIThresholdKey = keyof typeof AI_THRESHOLDS;
