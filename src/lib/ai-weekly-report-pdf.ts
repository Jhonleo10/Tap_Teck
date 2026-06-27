import type { AIIntelligencePayload } from "@/lib/ai/types";
import {
  renderBarChartImage,
  renderPieChartImage,
  renderHealthGaugeImage,
  renderLineChartImage,
} from "@/lib/pdf-charts";

const BRAND_RGB: [number, number, number] = [0, 111, 95];

export interface WeeklyReportPDFOptions {
  countryName: string;
  countryFlag?: string;
  formatCurrency: (amount: number) => string;
}

export async function exportWeeklyExecutiveReportPDF(
  data: AIIntelligencePayload,
  options: WeeklyReportPDFOptions
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const report = data.weeklyReport;
  const margin = 14;
  let y = 0;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > 285) {
      doc.addPage();
      y = 20;
    }
  };

  // Header band
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("TapTeck Weekly Executive Report", margin, 14);
  doc.setFontSize(10);
  doc.text(
    `${options.countryFlag ?? ""} ${options.countryName} · ${report.periodLabel}`,
    margin,
    22
  );
  doc.text(`Generated ${new Date(data.generatedAt).toLocaleString()} · Engine: ${data.provider}`, margin, 28);
  y = 40;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text("Executive Summary", margin, y);
  y += 6;

  const summaryRows = [
    ["Weekly Revenue", options.formatCurrency(report.weeklyRevenue)],
    ["Weekly Bookings", String(report.weeklyBookings)],
    ["Revenue Growth", `${report.revenueGrowthPercent}%`],
    ["Booking Growth", `${report.bookingGrowthPercent}%`],
    ["New Customers", String(report.customerGrowth)],
    ["New Providers", String(report.providerGrowth)],
    ["Referral Growth", String(report.referralGrowth)],
    ["Avg Rating", `${report.reviewStats.averageRating}★`],
    ["Cancellation Rate", `${Math.round(report.cancellationRate * 100)}%`],
    ["Business Health", data.businessHealth.tier.replace(/_/g, " ")],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: summaryRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND_RGB },
    theme: "striped",
  });
  y = ((doc as import("jspdf").jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? y) + 10;

  // Health gauge chart
  addPageIfNeeded(45);
  doc.setFontSize(11);
  doc.text("Platform Health", margin, y);
  y += 4;
  const healthImg = renderHealthGaugeImage(data.businessHealth.score, data.businessHealth.tier);
  doc.addImage(healthImg, "PNG", margin, y, 90, 34);
  y += 40;

  // Top services bar chart
  const serviceLabels = report.topServices.slice(0, 6).map((s) => s.name);
  const serviceBookings = report.topServices.slice(0, 6).map((s) => s.bookings);
  if (serviceLabels.length > 0) {
    addPageIfNeeded(75);
    doc.text("Top Services by Bookings", margin, y);
    y += 4;
    const barImg = renderBarChartImage(serviceLabels, serviceBookings, {
      title: "Weekly bookings per service",
      color: "#006F5F",
    });
    doc.addImage(barImg, "PNG", margin, y, 180, 70);
    y += 76;
  }

  // Revenue pie — top cities
  const citySlices = report.topCities
    .filter((c) => c.bookings > 0)
    .slice(0, 5)
    .map((c) => ({ label: c.name, value: c.bookings }));
  if (citySlices.length > 0) {
    addPageIfNeeded(75);
    doc.text("Bookings by City", margin, y);
    y += 4;
    const pieImg = renderPieChartImage(citySlices, { title: "Geographic distribution" });
    doc.addImage(pieImg, "PNG", margin, y, 120, 70);
    y += 76;
  }

  // Rating trend line chart
  const ratingTrend = data.reviewIntelligence.ratingTrend;
  if (ratingTrend.length > 0) {
    addPageIfNeeded(75);
    doc.text("Review Rating Trend", margin, y);
    y += 4;
    const lineImg = renderLineChartImage(
      ratingTrend.map((r) => r.period),
      ratingTrend.map((r) => r.avg),
      { title: "Average rating over time" }
    );
    doc.addImage(lineImg, "PNG", margin, y, 180, 60);
    y += 66;
  }

  // Revenue forecast bar
  const forecast = data.revenueIntelligence.revenueForecast;
  if (forecast.length > 0) {
    addPageIfNeeded(75);
    doc.text("Revenue Forecast", margin, y);
    y += 4;
    const forecastImg = renderBarChartImage(
      forecast.map((f) => f.period),
      forecast.map((f) => f.amount),
      {
        title: "Projected revenue (₹)",
        valuePrefix: "₹",
        color: "#0E8A72",
      }
    );
    doc.addImage(forecastImg, "PNG", margin, y, 180, 70);
    y += 76;
  }

  // Top providers table
  addPageIfNeeded(40);
  doc.text("Top Providers", margin, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Provider", "Jobs", "Rating"]],
    body: report.topProviders.map((p) => [p.name, String(p.jobs), `${p.rating.toFixed(1)}★`]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
    headStyles: { fillColor: BRAND_RGB },
  });
  y = ((doc as import("jspdf").jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? y) + 8;

  // Recommendations
  addPageIfNeeded(30);
  doc.setFontSize(11);
  doc.text("AI Recommendations", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  report.recommendations.slice(0, 6).forEach((rec, i) => {
    addPageIfNeeded(8);
    doc.text(`${i + 1}. [${rec.priority}] ${rec.title}`, margin, y);
    y += 5;
    doc.text(`   ${rec.description}`, margin, y);
    y += 7;
  });

  // Advisor insights footer
  addPageIfNeeded(20);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.text("Key Business Insights", margin, y);
  y += 6;
  doc.setFontSize(9);
  data.advisorInsights.slice(0, 5).forEach((insight) => {
    addPageIfNeeded(8);
    doc.text(`• ${insight.title}: ${insight.description}`, margin, y, { maxWidth: 180 });
    y += 10;
  });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "TapTeck Admin Portal · Analytics source: PostgreSQL via Prisma · AI interprets only; figures from database.",
    margin,
    290
  );

  doc.save(`tapteck-weekly-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
