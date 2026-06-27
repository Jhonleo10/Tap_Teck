/**
 * TapTeck AI Layer — shared types.
 * UI and business logic depend only on these contracts, not on a specific AI vendor.
 */

export type InsightCategory =
  | "REVENUE"
  | "BOOKINGS"
  | "GROWTH"
  | "OPERATIONS"
  | "REFERRAL"
  | "SATISFACTION"
  | "TREND"
  | "PROVIDER"
  | "CUSTOMER";

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export type HealthTier = "EXCELLENT" | "GOOD" | "AVERAGE" | "NEEDS_ATTENTION" | "POOR";

export type RecommendationPriority = "HIGH" | "MEDIUM" | "LOW";

export interface AIInsight {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  metric?: string;
  changePercent?: number;
  trend?: "up" | "down" | "stable";
  href?: string;
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  actionLabel?: string;
  href?: string;
  rationale: string;
}

export interface AIAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  href?: string;
}

export interface HealthMetric {
  key: string;
  label: string;
  score: number;
  weight: number;
  value: string;
}

export interface BusinessHealthScore {
  score: number;
  tier: HealthTier;
  metrics: HealthMetric[];
}

export interface TrendCard {
  id: string;
  title: string;
  description: string;
  value: string;
  changePercent?: number;
  trend: "up" | "down" | "stable";
}

export interface PredictionItem {
  id: string;
  title: string;
  value: string;
  confidence: number;
  description: string;
}

export interface DailyBriefing {
  greeting: string;
  headline: string;
  summary: string;
  metrics: {
    todayRevenue: number;
    todayBookings: number;
    newUsers: number;
    newProviders: number;
    pendingVerification: number;
    pendingReviews: number;
    referralGrowth: number;
    businessHealth: HealthTier;
  };
  topServices: { name: string; count: number }[];
  topCities: { name: string; count: number }[];
  topProviders: { name: string; metric: string }[];
}

export interface WeeklyReport {
  periodLabel: string;
  weeklyRevenue: number;
  weeklyBookings: number;
  revenueGrowthPercent: number;
  bookingGrowthPercent: number;
  customerGrowth: number;
  providerGrowth: number;
  topServices: { name: string; revenue: number; bookings: number }[];
  topCities: { name: string; bookings: number }[];
  topProviders: { name: string; jobs: number; rating: number }[];
  referralGrowth: number;
  rewardsDistributed: number;
  reviewStats: { averageRating: number; total: number; positivePercent: number };
  cancellationRate: number;
  recommendations: AIRecommendation[];
  exportRows: Record<string, string | number>[];
}

export interface AIIntelligencePayload {
  generatedAt: string;
  country: string;
  provider: string;
  advisorInsights: AIInsight[];
  recommendations: AIRecommendation[];
  alerts: AIAlert[];
  dailyBriefing: DailyBriefing;
  weeklyReport: WeeklyReport;
  businessHealth: BusinessHealthScore;
  trends: TrendCard[];
  predictions: PredictionItem[];
  reviewIntelligence: ReviewAIIntelligence;
  providerIntelligence: ProviderAIIntelligence;
  customerIntelligence: CustomerAIIntelligence;
  revenueIntelligence: RevenueAIIntelligence;
  operationalIntelligence: OperationalAIIntelligence;
}

export interface ReviewAIIntelligence {
  averageRating: number;
  ratingTrend: { period: string; avg: number }[];
  positiveKeywords: { word: string; count: number }[];
  negativeKeywords: { word: string; count: number }[];
  repeatedComplaints: string[];
  lowRatedProviders: { name: string; avgRating: number; count: number }[];
  sentimentSummary: string;
}

export interface ProviderAIIntelligence {
  topPerformers: ProviderScorecard[];
  mostReliable: ProviderScorecard[];
  mostImproved: ProviderScorecard[];
  highestRevenue: ProviderScorecard[];
  atRisk: ProviderScorecard[];
  slowResponse: ProviderScorecard[];
  highCancellation: ProviderScorecard[];
}

export interface ProviderScorecard {
  id: string;
  businessName: string;
  score: number;
  metric: string;
  tier?: string;
}

export interface CustomerAIIntelligence {
  mostActive: { name: string; bookings: number }[];
  repeatCustomers: { name: string; bookings: number }[];
  referralChampions: { name: string; referrals: number }[];
  highestSpending: { name: string; totalSpent: number }[];
  retentionRate: number;
  avgBookingFrequency: number;
  favoriteCategories: { category: string; count: number }[];
}

export interface RevenueAIIntelligence {
  highestCategory: { name: string; revenue: number } | null;
  highestService: { name: string; revenue: number } | null;
  highestCity: { name: string; revenue: number } | null;
  highestProvider: { name: string; revenue: number } | null;
  averageBookingValue: number;
  revenueForecast: { period: string; amount: number; confidence: number }[];
  monthlyGrowthPercent: number;
  yearlyGrowthPercent: number;
}

export interface OperationalAIIntelligence {
  pendingVerification: number;
  bookingDelays: number;
  avgResponseTimeMinutes: number;
  notificationBacklog: number;
  reviewBacklog: number;
  rewardBacklog: number;
  priorityAlerts: AIAlert[];
}

export interface AISearchResult {
  label: string;
  description: string;
  href: string;
  type: "navigation" | "insight" | "filter";
}

export interface AIProviderContext {
  country: string;
  analytics: import("@/services/analytics/analytics-engine.service").AnalyticsSnapshot;
}

export interface AIProvider {
  readonly name: string;
  isAvailable?(): boolean;
  generateInsights(ctx: AIProviderContext): AIInsight[];
  generateRecommendations(ctx: AIProviderContext): AIRecommendation[];
  generateAlerts(ctx: AIProviderContext): AIAlert[];
  generatePredictions(ctx: AIProviderContext): PredictionItem[];
}
