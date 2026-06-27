import type {
  AIProvider,
  AIProviderContext,
  AIInsight,
  AIRecommendation,
  AIAlert,
  PredictionItem,
} from "@/lib/ai/types";

abstract class CloudAIProvider implements AIProvider {
  abstract readonly name: string;
  protected abstract envKey: string;

  isAvailable(): boolean {
    return !!process.env[this.envKey];
  }

  private unavailable(): never {
    throw new Error(
      `${this.name} is not configured. Set ${this.envKey} or use rule-based provider.`
    );
  }

  generateInsights(_ctx: AIProviderContext): AIInsight[] {
    if (!this.isAvailable()) return [];
    this.unavailable();
  }

  generateRecommendations(_ctx: AIProviderContext): AIRecommendation[] {
    if (!this.isAvailable()) return [];
    this.unavailable();
  }

  generateAlerts(_ctx: AIProviderContext): AIAlert[] {
    if (!this.isAvailable()) return [];
    this.unavailable();
  }

  generatePredictions(_ctx: AIProviderContext): PredictionItem[] {
    if (!this.isAvailable()) return [];
    this.unavailable();
  }
}

export class OpenAIProvider extends CloudAIProvider {
  readonly name = "openai";
  protected envKey = "OPENAI_API_KEY";
}

export class GeminiProvider extends CloudAIProvider {
  readonly name = "gemini";
  protected envKey = "GEMINI_API_KEY";
}

export class OllamaProvider extends CloudAIProvider {
  readonly name = "ollama";
  protected envKey = "OLLAMA_BASE_URL";
}

export class ClaudeProvider extends CloudAIProvider {
  readonly name = "claude";
  protected envKey = "ANTHROPIC_API_KEY";
}
