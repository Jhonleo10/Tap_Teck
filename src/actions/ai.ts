"use server";

import { withAction } from "@/lib/action-response";
import { getAIIntelligence } from "@/services/ai/ai-orchestrator.service";
import { parseNaturalLanguageQuery } from "@/services/ai/ai-search.service";
import { listAIProviders, getAIProvider, getActiveAIProviderName } from "@/lib/ai/registry";
import { buildAnalyticsSnapshot } from "@/services/analytics/analytics-engine.service";
import { cached } from "@/lib/server-cache";

export async function fetchAIIntelligence(country: string) {
  return withAction(
    () => cached(`ai-intel:${country}`, 45_000, () => getAIIntelligence(country)),
    "fetchAIIntelligence"
  );
}

/** Lightweight advisor strip for dashboard — insights only, no full intelligence bundle. */
export async function fetchAdvisorPreview(country: string) {
  return withAction(async () => {
    const analytics = await buildAnalyticsSnapshot(country);
    const provider = getAIProvider();
    return {
      provider: getActiveAIProviderName(),
      advisorInsights: provider.generateInsights({ country, analytics }),
    };
  }, "fetchAdvisorPreview");
}

export async function aiNaturalLanguageSearch(query: string) {
  return withAction(
    () => Promise.resolve(parseNaturalLanguageQuery(query)),
    "aiNaturalLanguageSearch"
  );
}

export async function fetchAIProviders() {
  return withAction(
    () => Promise.resolve(listAIProviders()),
    "fetchAIProviders"
  );
}
