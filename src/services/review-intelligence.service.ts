import { prisma } from "@/lib/prisma";

export interface ReviewIntelligence {
  averageRating: number;
  totalReviews: number;
  distribution: { rating: number; count: number }[];
  positiveCount: number;
  negativeCount: number;
  trend: { month: string; avgRating: number; count: number }[];
  topProviders: { businessName: string; count: number; avgRating: number }[];
  lowRatedProviders: { businessName: string; count: number; avgRating: number }[];
  flags: {
    type: "LOW_RATING" | "REPEATED_COMPLAINT" | "SPAM_PATTERN";
    message: string;
    providerName?: string;
  }[];
}

export async function getReviewIntelligence(country?: string): Promise<ReviewIntelligence> {
  const reviews = await prisma.review.findMany({
    where: country
      ? { provider: { country } }
      : undefined,
    select: {
      rating: true,
      comment: true,
      createdAt: true,
      provider: { select: { businessName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const total = reviews.length;
  const averageRating =
    total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;

  const distribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
  }));

  const positiveCount = reviews.filter((r) => r.rating >= 4).length;
  const negativeCount = reviews.filter((r) => r.rating <= 2).length;

  const monthMap: Record<string, { sum: number; count: number }> = {};
  reviews.forEach((r) => {
    const key = new Date(r.createdAt).toLocaleDateString("en", {
      month: "short",
      year: "2-digit",
    });
    if (!monthMap[key]) monthMap[key] = { sum: 0, count: 0 };
    monthMap[key].sum += r.rating;
    monthMap[key].count += 1;
  });

  const trend = Object.entries(monthMap)
    .map(([month, data]) => ({
      month,
      avgRating: Math.round((data.sum / data.count) * 10) / 10,
      count: data.count,
    }))
    .slice(-6);

  const providerMap: Record<string, { name: string; ratings: number[] }> = {};
  reviews.forEach((r) => {
    const name = r.provider.businessName;
    if (!providerMap[name]) providerMap[name] = { name, ratings: [] };
    providerMap[name].ratings.push(r.rating);
  });

  const providerStats = Object.values(providerMap).map((p) => ({
    businessName: p.name,
    count: p.ratings.length,
    avgRating: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length,
  }));

  const topProviders = [...providerStats]
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 5);

  const lowRatedProviders = [...providerStats]
    .filter((p) => p.count >= 2 && p.avgRating < 3.5)
    .sort((a, b) => a.avgRating - b.avgRating)
    .slice(0, 5);

  const flags: ReviewIntelligence["flags"] = [];
  lowRatedProviders.forEach((p) => {
    flags.push({
      type: "LOW_RATING",
      message: `${p.businessName} averages ${p.avgRating.toFixed(1)}★ across ${p.count} reviews`,
      providerName: p.businessName,
    });
  });

  const commentWords: Record<string, number> = {};
  reviews
    .filter((r) => r.rating <= 2 && r.comment)
    .forEach((r) => {
      r.comment!.toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .forEach((w) => {
          commentWords[w] = (commentWords[w] ?? 0) + 1;
        });
    });

  Object.entries(commentWords)
    .filter(([, count]) => count >= 3)
    .forEach(([word, count]) => {
      flags.push({
        type: "REPEATED_COMPLAINT",
        message: `"${word}" appears in ${count} negative reviews`,
      });
    });

  if (reviews.filter((r) => r.rating === 5 && !r.comment).length > 10) {
    flags.push({
      type: "SPAM_PATTERN",
      message: "High volume of 5★ reviews without comments detected",
    });
  }

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: total,
    distribution,
    positiveCount,
    negativeCount,
    trend,
    topProviders,
    lowRatedProviders,
    flags,
  };
}
