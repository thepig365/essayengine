import type { EngineRequest, LLMProvider, ProviderResult } from "@/types/engine";

type ProviderConfig = {
  baseUrl: string;
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel: string;
  displayName: string;
};

const CONFIGS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
    displayName: "OpenAI",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
    displayName: "DeepSeek",
  },
  qwen: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "QWEN_API_KEY",
    modelEnv: "QWEN_MODEL",
    defaultModel: "qwen-plus",
    displayName: "Qwen",
  },
};

const DEFAULT_FALLBACK: Record<LLMProvider, LLMProvider[]> = {
  openai: ["deepseek", "qwen"],
  deepseek: ["qwen", "openai"],
  qwen: ["deepseek", "openai"],
};

export function providerDisplayName(provider: LLMProvider): string {
  return CONFIGS[provider].displayName;
}

async function callProviderRaw(provider: LLMProvider, prompt: string): Promise<string> {
  const cfg = CONFIGS[provider];
  const apiKey = process.env[cfg.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`${cfg.apiKeyEnv} is not set.`);
  }
  const model = process.env[cfg.modelEnv] || cfg.defaultModel;

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${cfg.displayName} request failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function callOpenAI(prompt: string): Promise<string> {
  return callProviderRaw("openai", prompt);
}

export async function callDeepSeek(prompt: string): Promise<string> {
  return callProviderRaw("deepseek", prompt);
}

export async function callQwen(prompt: string): Promise<string> {
  return callProviderRaw("qwen", prompt);
}

export async function callProvider(provider: LLMProvider, prompt: string): Promise<string> {
  return callProviderRaw(provider, prompt);
}

function shortError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}

export async function callWithFallback(
  primary: LLMProvider,
  fallback: LLMProvider[],
  prompt: string,
): Promise<ProviderResult> {
  const startedAt = Date.now();
  try {
    const output = await callProviderRaw(primary, prompt);
    return {
      requestedProvider: primary,
      actualProvider: primary,
      output,
      fallbackUsed: false,
      success: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (firstErr) {
    let lastErrMsg = shortError(firstErr);
    for (const fb of fallback) {
      try {
        const output = await callProviderRaw(fb, prompt);
        return {
          requestedProvider: primary,
          actualProvider: fb,
          output,
          fallbackUsed: true,
          success: true,
          latencyMs: Date.now() - startedAt,
          error: `Primary ${primary} failed (${shortError(firstErr)}); fallback used: ${fb}.`,
        };
      } catch (e) {
        lastErrMsg = shortError(e);
      }
    }
    return {
      requestedProvider: primary,
      actualProvider: primary,
      output: "",
      fallbackUsed: false,
      success: false,
      latencyMs: Date.now() - startedAt,
      error: `All providers failed. Last error: ${lastErrMsg}`,
    };
  }
}

export function selectProviderStrategy(request: EngineRequest): {
  primary: LLMProvider;
  fallback: LLMProvider[];
} {
  if (request.providers && request.providers.length === 1) {
    const primary = request.providers[0];
    return { primary, fallback: DEFAULT_FALLBACK[primary] };
  }

  const target = (request.targetLanguage ?? "").toLowerCase();
  const isChinese =
    /chinese|mandarin|cantonese|simplified|traditional/.test(target) ||
    /\bzh\b/.test(target) ||
    /[一-鿿]/.test(request.targetLanguage ?? "");
  const isLongInput = (request.input ?? "").length > 5000;
  const isSummarize = request.task === "summarize";
  const isStructuralCritical = request.outputMode === "text_node_only";

  if (isStructuralCritical) {
    return { primary: "openai", fallback: ["deepseek", "qwen"] };
  }
  if (isChinese) {
    return { primary: "qwen", fallback: ["openai", "deepseek"] };
  }
  if (isSummarize || isLongInput) {
    return { primary: "deepseek", fallback: ["openai", "qwen"] };
  }
  return { primary: "openai", fallback: ["deepseek", "qwen"] };
}

export function defaultFallbackFor(primary: LLMProvider): LLMProvider[] {
  return DEFAULT_FALLBACK[primary];
}
