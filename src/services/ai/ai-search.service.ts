import type { AISearchResult } from "@/lib/ai/types";

interface QueryPattern {
  patterns: RegExp[];
  label: string;
  description: string;
  href: string;
}

const QUERY_PATTERNS: QueryPattern[] = [
  {
    patterns: [/today.*bookings?/i, /bookings?.*today/i, /show.*bookings?/i],
    label: "Today's Bookings",
    description: "View bookings created today",
    href: "/bookings",
  },
  {
    patterns: [/top providers?/i, /best providers?/i, /highest.*providers?/i],
    label: "Top Providers",
    description: "Provider performance and rankings",
    href: "/ai#provider-intelligence",
  },
  {
    patterns: [/highest revenue city/i, /top cit(y|ies)/i, /revenue.*city/i],
    label: "Highest Revenue City",
    description: "Revenue intelligence by location",
    href: "/ai#revenue-intelligence",
  },
  {
    patterns: [/pending.*verif/i, /verif.*pending/i, /verification queue/i],
    label: "Pending Verification",
    description: "Providers awaiting document review",
    href: "/verification",
  },
  {
    patterns: [/cancel/i, /most cancelled/i],
    label: "Cancellation Analysis",
    description: "Bookings with elevated cancellation rates",
    href: "/bookings",
  },
  {
    patterns: [/revenue/i, /earnings/i, /sales/i],
    label: "Revenue Analytics",
    description: "Revenue trends and forecasts",
    href: "/ai#revenue-intelligence",
  },
  {
    patterns: [/review/i, /rating/i, /feedback/i],
    label: "Review Intelligence",
    description: "Ratings, sentiment, and complaints",
    href: "/ai#review-intelligence",
  },
  {
    patterns: [/referral/i, /invite/i],
    label: "Referral Program",
    description: "Referral growth and rewards",
    href: "/referrals",
  },
  {
    patterns: [/alert/i, /warning/i, /issue/i],
    label: "Platform Alerts",
    description: "Operational alerts and priorities",
    href: "/ai#alerts",
  },
  {
    patterns: [/forecast/i, /predict/i, /next week/i],
    label: "Predictive Analytics",
    description: "Bookings and revenue projections",
    href: "/ai#predictions",
  },
  {
    patterns: [/weekly report/i, /executive/i, /summary/i],
    label: "Weekly Executive Report",
    description: "Weekly business summary",
    href: "/ai#weekly-report",
  },
  {
    patterns: [/customer/i, /user/i, /retention/i],
    label: "Customer Intelligence",
    description: "Customer activity and retention",
    href: "/ai#customer-intelligence",
  },
  {
    patterns: [/health/i, /platform status/i],
    label: "Business Health Score",
    description: "Overall platform health meter",
    href: "/ai#health-score",
  },
  {
    patterns: [/notification/i, /unread/i],
    label: "Notifications",
    description: "Notification center",
    href: "/notifications",
  },
  {
    patterns: [/reward/i, /leaderboard/i],
    label: "Rewards & Leaderboard",
    description: "Provider rewards program",
    href: "/referrals",
  },
];

export function parseNaturalLanguageQuery(query: string): AISearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];

  const results: AISearchResult[] = [];
  const seen = new Set<string>();

  for (const pattern of QUERY_PATTERNS) {
    if (pattern.patterns.some((re) => re.test(q))) {
      if (!seen.has(pattern.href)) {
        seen.add(pattern.href);
        results.push({
          label: pattern.label,
          description: pattern.description,
          href: pattern.href,
          type: "navigation",
        });
      }
    }
  }

  if (results.length === 0) {
    results.push({
      label: "AI Intelligence Dashboard",
      description: `Search "${query}" across TapTeck operations`,
      href: `/ai?q=${encodeURIComponent(query)}`,
      type: "insight",
    });
  }

  return results.slice(0, 8);
}
