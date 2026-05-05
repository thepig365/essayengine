import type { EngineRequest, EngineResponse, ProviderResult } from "@/types/engine";
import { detectInputType } from "@/engine/detectInputType";
import { routeOutputMode } from "@/engine/routeOutputMode";
import { buildPrompt } from "@/engine/buildPrompt";
import { validateOutput } from "@/engine/validateOutput";
import { getYouTubeTranscript, TRANSCRIPT_UNAVAILABLE_MESSAGE } from "@/engine/youtubeTranscript";
import { fetchWebpageSource } from "@/engine/fetchWebpage";
import {
  callWithFallback,
  defaultFallbackFor,
  selectProviderStrategy,
} from "@/lib/llmProvider";

const WEBPAGE_UNAVAILABLE_MESSAGE =
  "Webpage content could not be fetched. The site may block requests or require authentication.";

export async function runEngine(request: EngineRequest): Promise<EngineResponse> {
  const warnings: string[] = [];
  const inputType = detectInputType(request.input);
  let resolvedInput = request.input;

  if (inputType === "youtube_url") {
    const transcript = await getYouTubeTranscript(request.input);
    if (!transcript.text) {
      warnings.push(TRANSCRIPT_UNAVAILABLE_MESSAGE);
      const outputMode = routeOutputMode(request);
      return { output: "", outputMode, inputType, warnings };
    }
    warnings.push("YouTube transcript was used as source input.");
    if (transcript.text.length < 100) {
      warnings.push("Transcript is very short (fewer than 100 characters).");
    }
    resolvedInput = transcript.text;
  } else if (inputType === "url") {
    const fetched = await fetchWebpageSource(request.input);
    if (!fetched.content) {
      warnings.push(WEBPAGE_UNAVAILABLE_MESSAGE);
      const outputMode = routeOutputMode(request);
      return { output: "", outputMode, inputType, warnings };
    }
    warnings.push("Webpage content was fetched and cleaned as source input.");
    if (fetched.truncated) {
      warnings.push("Webpage content was truncated for model safety.");
    }
    resolvedInput = fetched.content;
  }

  const resolvedRequest: EngineRequest = { ...request, input: resolvedInput };
  const outputMode = routeOutputMode(resolvedRequest);
  const prompt = buildPrompt(resolvedRequest, inputType, outputMode);

  const selected = request.providers ?? [];
  const isMulti = selected.length > 1;

  if (isMulti) {
    const outputs = await Promise.all(
      selected.map((p) =>
        callWithFallback(p, defaultFallbackFor(p), prompt),
      ),
    );

    for (const r of outputs) {
      if (r.error) warnings.push(`[${r.requestedProvider}] ${r.error}`);
      if (r.output) {
        const w = validateOutput({
          input: resolvedInput,
          output: r.output,
          inputType,
          outputMode,
        });
        for (const m of w) warnings.push(`[${r.requestedProvider}] ${m}`);
      } else if (!r.error) {
        warnings.push(`[${r.requestedProvider}] Empty output.`);
      }
    }

    return {
      output: outputs.find((o) => o.output)?.output ?? "",
      outputs,
      outputMode,
      inputType,
      warnings,
    };
  }

  const strategy = selected.length === 1
    ? { primary: selected[0], fallback: defaultFallbackFor(selected[0]) }
    : selectProviderStrategy(resolvedRequest);

  const result: ProviderResult = await callWithFallback(strategy.primary, strategy.fallback, prompt);

  if (result.error) warnings.push(result.error);

  if (result.output) {
    const validationWarnings = validateOutput({
      input: resolvedInput,
      output: result.output,
      inputType,
      outputMode,
    });
    warnings.push(...validationWarnings);
  }

  return {
    output: result.output,
    outputs: [result],
    outputMode,
    inputType,
    warnings,
  };
}
