"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  FileDown,
  RefreshCw,
  Brain,
  DollarSign,
  CalendarCheck,
  Users,
  ShieldAlert,
  Gift,
  MessageSquare,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { GlassCard } from "@/components/shared/glass-card";
import { MetricCard } from "@/components/shared/metric-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ErrorCard } from "@/components/shared/error-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/ai/insight-card";
import { RecommendationCard } from "@/components/ai/recommendation-card";
import { AlertCard } from "@/components/ai/alert-card";
import { HealthMeter } from "@/components/ai/health-meter";
import { TrendCard, PredictionCard } from "@/components/ai/trend-prediction-cards";
import { AISearchAssistant } from "@/components/ai/ai-search-assistant";
import { PlatformHealthWidget } from "@/components/operations/platform-health-widget";
import { fetchAIIntelligence } from "@/actions/ai";
import { useOperationsPoll } from "@/hooks/use-operations-poll";
import { useCountry } from "@/components/providers/country-provider";
import { formatCurrency } from "@/lib/utils";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { exportWeeklyExecutiveReportPDF } from "@/lib/ai-weekly-report-pdf";
import type { AIIntelligencePayload } from "@/lib/ai/types";

function IntelligenceSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <SectionHeader title={title} description={description} />
      {children}
    </section>
  );
}

export function AIDashboardContent({
  initialQuery = "",
  initialData = null,
  serverCountry,
}: {
  initialQuery?: string;
  initialData?: AIIntelligencePayload | null;
  serverCountry?: string;
}) {
  const { countryCode, country, isReady } = useCountry();
  const [exporting, setExporting] = useState(false);
  const fetcher = useCallback(
    () => fetchAIIntelligence(countryCode),
    [countryCode]
  );
  const { data, error, isPending, refresh } = useOperationsPoll<AIIntelligencePayload>({
    fetcher,
    intervalMs: 120_000,
    enabled: isReady,
    initialData: serverCountry && countryCode === serverCountry ? initialData : null,
    skipInitialFetch: !!(initialData && serverCountry && countryCode === serverCountry),
    deferMs: 5_000,
  });

  const fmt = (n: number) => formatCurrency(n, country.currency, country.locale);

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (!data) {
      toast.error("No report data loaded yet");
      return;
    }
    setExporting(true);
    try {
      const rows = data.weeklyReport.exportRows;
      if (format === "csv") {
        exportToCSV(rows, "tapteck-weekly-report");
        toast.success("CSV report downloaded");
      } else if (format === "excel") {
        exportToExcel(rows, "tapteck-weekly-report", "Weekly Report");
        toast.success("Excel report downloaded");
      } else {
        await exportWeeklyExecutiveReportPDF(data, {
          countryName: country.name,
          countryFlag: country.flag,
          formatCurrency: fmt,
        });
        toast.success("PDF report with charts downloaded");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (!isReady) return <LoadingSpinner className="py-24" />;

  if (error && !data) {
    return <ErrorCard message={error} onRetry={refresh} />;
  }

  if (!data) {
    return <LoadingSpinner className="py-24" text="Building AI intelligence..." />;
  }

  const briefing = data.dailyBriefing;
  const forecastChart = data.revenueIntelligence.revenueForecast.map((f) => ({
    period: f.period,
    amount: f.amount,
    confidence: f.confidence,
  }));

  return (
    <div className="space-y-10">
      <PageHeader
        title="AI Intelligence"
        description={`${country.flag} ${country.name} · Decision support powered by analytics`}
        badge="AI Layer"
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5"
            onClick={refresh}
            disabled={isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <span className="inline-flex items-center gap-1 rounded-xl border bg-muted/40 px-3 py-1.5 text-xs font-medium">
            <Brain className="h-3.5 w-3.5" />
            Engine: {data.provider}
          </span>
        </div>
      </PageHeader>

      {/* Daily Briefing */}
      <GlassCard className="relative overflow-hidden border-primary/15 p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#006F5F]/10 blur-3xl" />
        <div className="relative space-y-4">
          <p className="text-lg font-semibold">{briefing.greeting}</p>
          <h2 className="text-2xl font-bold">{briefing.headline}</h2>
          <p className="text-muted-foreground">{briefing.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Today's Revenue" value={fmt(briefing.metrics.todayRevenue)} icon={DollarSign} accent="green" animate={false} />
            <MetricCard title="Today's Bookings" value={briefing.metrics.todayBookings} numericValue={briefing.metrics.todayBookings} icon={CalendarCheck} accent="teal" />
            <MetricCard title="New Users" value={briefing.metrics.newUsers} numericValue={briefing.metrics.newUsers} icon={Users} accent="teal" />
            <MetricCard title="Pending Verification" value={briefing.metrics.pendingVerification} numericValue={briefing.metrics.pendingVerification} icon={ShieldAlert} accent="amber" />
          </div>
        </div>
      </GlassCard>

      <AISearchAssistant initialQuery={initialQuery} />

      {/* Business Advisor */}
      <IntelligenceSection
        id="business-advisor"
        title="TapTeck AI Business Advisor"
        description="Automatically generated insights from marketplace analytics"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.advisorInsights.length === 0 ? (
            <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
              No insights yet — data will appear as marketplace activity grows.
            </p>
          ) : (
            data.advisorInsights.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))
          )}
        </div>
      </IntelligenceSection>

      {/* Recommendations */}
      <IntelligenceSection
        id="recommendations"
        title="AI Recommendations"
        description="Operational actions ranked by priority"
      >
        <div className="space-y-3">
          {data.recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recommendations at this time.</p>
          ) : (
            data.recommendations.map((rec, i) => (
              <RecommendationCard key={rec.id} recommendation={rec} index={i} />
            ))
          )}
        </div>
      </IntelligenceSection>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Health Score */}
        <IntelligenceSection id="health-score" title="Business Health Score">
          <GlassCard className="p-5">
            <HealthMeter health={data.businessHealth} />
          </GlassCard>
        </IntelligenceSection>

        <div className="lg:col-span-1">
          <PlatformHealthWidget />
        </div>

        {/* Alerts */}
        <IntelligenceSection id="alerts" title="Platform Alerts">
          <div className="space-y-2">
            {data.alerts.length === 0 ? (
              <GlassCard className="p-4 text-sm text-muted-foreground">All clear — no active alerts.</GlassCard>
            ) : (
              data.alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
            )}
          </div>
        </IntelligenceSection>
      </div>

      {/* Trends */}
      <IntelligenceSection id="trends" title="Trend Detection" description="Services, locations, and growth patterns">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.trends.map((t, i) => (
            <TrendCard key={t.id} trend={t} index={i} />
          ))}
        </div>
      </IntelligenceSection>

      {/* Predictions */}
      <IntelligenceSection id="predictions" title="Predictive Analytics" description="Rule-based forecasts with confidence indicators">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.predictions.map((p, i) => (
            <PredictionCard key={p.id} prediction={p} index={i} />
          ))}
        </div>
      </IntelligenceSection>

      {/* Revenue Intelligence */}
      <IntelligenceSection id="revenue-intelligence" title="Revenue Intelligence">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <GlassCard className="p-4">
              <p className="text-xs text-muted-foreground">Avg Booking Value</p>
              <p className="text-xl font-bold">{fmt(data.revenueIntelligence.averageBookingValue)}</p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-xs text-muted-foreground">Monthly Growth</p>
              <p className="text-xl font-bold">{data.revenueIntelligence.monthlyGrowthPercent}%</p>
            </GlassCard>
            {data.revenueIntelligence.highestCity && (
              <GlassCard className="p-4 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Highest Revenue City</p>
                <p className="font-semibold">{data.revenueIntelligence.highestCity.name}</p>
                <p className="text-primary">{fmt(data.revenueIntelligence.highestCity.revenue)}</p>
              </GlassCard>
            )}
          </div>
          <ChartCard title="Revenue Forecast">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={forecastChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="amount" stroke="#006F5F" fill="#006F5F" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </IntelligenceSection>

      {/* Review Intelligence */}
      <IntelligenceSection id="review-intelligence" title="Review Intelligence">
        <GlassCard className="space-y-4 p-5">
          <p className="text-sm">{data.reviewIntelligence.sentimentSummary}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold">Positive Keywords</p>
              <div className="flex flex-wrap gap-2">
                {data.reviewIntelligence.positiveKeywords.map((k) => (
                  <span key={k.word} className="rounded-full bg-[#22C55E]/10 px-2.5 py-1 text-xs font-medium text-[#16a34a]">
                    {k.word} ({k.count})
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Negative Keywords</p>
              <div className="flex flex-wrap gap-2">
                {data.reviewIntelligence.negativeKeywords.map((k) => (
                  <span key={k.word} className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600">
                    {k.word} ({k.count})
                  </span>
                ))}
              </div>
            </div>
          </div>
          {data.reviewIntelligence.repeatedComplaints.length > 0 && (
            <ul className="text-sm text-muted-foreground">
              {data.reviewIntelligence.repeatedComplaints.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          )}
        </GlassCard>
        <ChartCard title="Rating Trend">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.reviewIntelligence.ratingTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="#006F5F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </IntelligenceSection>

      {/* Provider Intelligence */}
      <IntelligenceSection id="provider-intelligence" title="Provider Intelligence">
        <div className="grid gap-4 lg:grid-cols-2">
          <ScorecardList title="Top Performers" items={data.providerIntelligence.topPerformers} />
          <ScorecardList title="Providers at Risk" items={data.providerIntelligence.atRisk} danger />
        </div>
      </IntelligenceSection>

      {/* Customer Intelligence */}
      <IntelligenceSection id="customer-intelligence" title="Customer Intelligence">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ListPanel title="Most Active" items={data.customerIntelligence.mostActive.map((c) => `${c.name} — ${c.bookings} bookings`)} />
          <ListPanel title="Referral Champions" items={data.customerIntelligence.referralChampions.map((c) => `${c.name} — ${c.referrals} refs`)} />
          <ListPanel title="Favorite Categories" items={data.customerIntelligence.favoriteCategories.map((c) => `${c.category} (${c.count})`)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard title="Retention Rate" value={`${Math.round(data.customerIntelligence.retentionRate * 100)}%`} icon={Users} accent="green" animate={false} />
          <MetricCard title="Avg Booking Frequency" value={data.customerIntelligence.avgBookingFrequency} icon={CalendarCheck} accent="teal" animate={false} />
        </div>
      </IntelligenceSection>

      {/* Operational Intelligence */}
      <IntelligenceSection id="operational-intelligence" title="Operational Intelligence">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard title="Verification Queue" value={data.operationalIntelligence.pendingVerification} numericValue={data.operationalIntelligence.pendingVerification} icon={ShieldAlert} accent="amber" />
          <MetricCard title="Review Backlog" value={data.operationalIntelligence.reviewBacklog} numericValue={data.operationalIntelligence.reviewBacklog} icon={MessageSquare} accent="teal" />
          <MetricCard title="Reward Backlog" value={data.operationalIntelligence.rewardBacklog} numericValue={data.operationalIntelligence.rewardBacklog} icon={Gift} accent="green" />
        </div>
      </IntelligenceSection>

      {/* Weekly Report */}
      <IntelligenceSection id="weekly-report" title="Weekly Executive Report" description={data.weeklyReport.periodLabel}>
        <GlassCard className="p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={exporting}
              onClick={() => handleExport("pdf")}
            >
              <FileDown className="h-4 w-4" /> PDF with Charts
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={exporting}
              onClick={() => handleExport("excel")}
            >
              <FileDown className="h-4 w-4" /> Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={exporting}
              onClick={() => handleExport("csv")}
            >
              <FileDown className="h-4 w-4" /> CSV
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Weekly Revenue</p><p className="text-lg font-bold">{fmt(data.weeklyReport.weeklyRevenue)}</p></div>
            <div><p className="text-xs text-muted-foreground">Weekly Bookings</p><p className="text-lg font-bold">{data.weeklyReport.weeklyBookings}</p></div>
            <div><p className="text-xs text-muted-foreground">Customer Growth</p><p className="text-lg font-bold">+{data.weeklyReport.customerGrowth}</p></div>
            <div><p className="text-xs text-muted-foreground">Cancellation Rate</p><p className="text-lg font-bold">{Math.round(data.weeklyReport.cancellationRate * 100)}%</p></div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold">Business Recommendations</p>
            {data.weeklyReport.recommendations.slice(0, 3).map((r) => (
              <p key={r.id} className="text-sm text-muted-foreground">• {r.title}</p>
            ))}
          </div>
        </GlassCard>
      </IntelligenceSection>
    </div>
  );
}

function ScorecardList({
  title,
  items,
  danger,
}: {
  title: string;
  items: { businessName: string; metric: string; score: number }[];
  danger?: boolean;
}) {
  return (
    <GlassCard className="p-4">
      <p className="mb-3 font-semibold">{title}</p>
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">No data</li>
        ) : (
          items.map((p) => (
            <li key={p.businessName} className="flex justify-between text-sm">
              <span>{p.businessName}</span>
              <span className={danger ? "text-red-600" : "text-muted-foreground"}>{p.metric}</span>
            </li>
          ))
        )}
      </ul>
    </GlassCard>
  );
}

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <GlassCard className="p-4">
      <p className="mb-2 font-semibold">{title}</p>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {items.length === 0 ? <li>—</li> : items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </GlassCard>
  );
}
