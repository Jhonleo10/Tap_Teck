import type { AIProvider } from "@/lib/ai/types";
import { RuleBasedProvider } from "@/lib/ai/providers/rule-based.provider";
import { OpenAIProvider } from "@/lib/ai/providers/openai.provider";
import { GeminiProvider } from "@/lib/ai/providers/gemini.provider";
import { OllamaProvider } from "@/lib/ai/providers/ollama.provider";
import { ClaudeProvider } from "@/lib/ai/providers/claude.provider";

export type AIProviderName =
  | "rule-based"
  | "openai"
  | "gemini"
  | "ollama"
  | "claude";

const providers: Record<AIProviderName, AIProvider> = {
  "rule-based": new RuleBasedProvider(),
  openai: new OpenAIProvider(),
  gemini: new GeminiProvider(),
  ollama: new OllamaProvider(),
  claude: new ClaudeProvider(),
};

/** Active provider — swap via env without changing UI. */
export function getActiveAIProviderName(): AIProviderName {
  const env = process.env.AI_PROVIDER as AIProviderName | undefined;
  if (env && env in providers && env !== "rule-based") {
    const p = providers[env];
    if (p.isAvailable?.()) return env;
  }
  return "rule-based";
}

export function getAIProvider(name?: AIProviderName): AIProvider {
  const key = name ?? getActiveAIProviderName();
  return providers[key];
}

export function listAIProviders(): { name: AIProviderName; available: boolean }[] {
  return (Object.keys(providers) as AIProviderName[]).map((name) => ({
    name,
    available: name === "rule-based" || (providers[name].isAvailable?.() ?? false),
  }));
}
