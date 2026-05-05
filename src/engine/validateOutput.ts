import type { InputType, ResolvedOutputMode } from "@/types/engine";

type ValidateParams = {
  input: string;
  output: string;
  inputType: InputType;
  outputMode: ResolvedOutputMode;
};

const TAG_RE = /<([a-zA-Z][a-zA-Z0-9-]*)\b/g;
const CLASS_RE = /class(?:Name)?=["']([^"']+)["']/g;
const ID_RE = /\bid=["']([^"']+)["']/g;
const HREF_RE = /\bhref=["']([^"']+)["']/g;
const SRC_RE = /\bsrc=["']([^"']+)["']/g;

function collect(re: RegExp, s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(re)) out.push(m[1]);
  return out;
}

function setOf(values: string[]): Set<string> {
  return new Set(values);
}

function diffSetsMissing(from: Set<string>, to: Set<string>): string[] {
  const missing: string[] = [];
  for (const v of from) if (!to.has(v)) missing.push(v);
  return missing;
}

function looksLikeMarkdown(s: string): boolean {
  return /^#{1,6}\s+/m.test(s) || /^\s*[-*+]\s+/m.test(s);
}

function hasDiffMarkers(s: string): boolean {
  return /^[+-][^+-]/m.test(s);
}

function looksLikeFullHtmlOrJsxFile(s: string): boolean {
  if (/<!doctype html/i.test(s)) return true;
  if (/<html[\s>]/i.test(s)) return true;
  if (/export\s+default\s+function/i.test(s)) return true;
  const tagCount = (s.match(/<[a-zA-Z]/g) ?? []).length;
  return tagCount > 8;
}

function tryParseJson(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

function ratioChange(before: number, after: number): number {
  if (before === 0) return 0;
  return Math.abs(after - before) / before;
}

export function validateOutput(params: ValidateParams): string[] {
  const { input, output, inputType, outputMode } = params;
  const warnings: string[] = [];

  if (!output || output.trim().length === 0) {
    warnings.push("Output is empty.");
    return warnings;
  }

  if (outputMode === "structured_data") {
    const trimmed = output.trim();
    if (trimmed.startsWith("```") || /```json/i.test(trimmed)) {
      warnings.push("Structured-data output appears to contain markdown code fences.");
    }
    const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    if (!tryParseJson(stripped)) {
      warnings.push("Structured-data output is not valid JSON.");
    }
  }

  if (outputMode === "same_format") {
    const inputHasTags = /<[a-zA-Z]/.test(input);
    const outputHasTags = /<[a-zA-Z]/.test(output);
    if (inputHasTags && !outputHasTags) {
      warnings.push("Same-format output contains no tags but the input did — structure was likely lost.");
    }
    if (inputType === "html" || inputType === "jsx" || inputType === "tsx") {
      const inputTags = setOf(collect(TAG_RE, input));
      const outputTags = setOf(collect(TAG_RE, output));
      const missingTags = diffSetsMissing(inputTags, outputTags);
      if (missingTags.length > 0) {
        warnings.push(`Same-format output is missing tags from the input: ${missingTags.slice(0, 5).join(", ")}.`);
      }
      const inputClasses = setOf(collect(CLASS_RE, input));
      const outputClasses = setOf(collect(CLASS_RE, output));
      const missingClasses = diffSetsMissing(inputClasses, outputClasses);
      if (missingClasses.length > 0) {
        warnings.push(`Same-format output may have changed class names: ${missingClasses.slice(0, 5).join(", ")}.`);
      }
      const inputHrefs = setOf(collect(HREF_RE, input));
      const outputHrefs = setOf(collect(HREF_RE, output));
      const missingHrefs = diffSetsMissing(inputHrefs, outputHrefs);
      if (missingHrefs.length > 0) {
        warnings.push(`Same-format output may have changed href links: ${missingHrefs.slice(0, 5).join(", ")}.`);
      }
      if (looksLikeMarkdown(output) && !looksLikeMarkdown(input)) {
        warnings.push("Same-format output appears to have been converted to markdown.");
      }
    }
  }

  if (outputMode === "text_node_only") {
    const tagsIn = collect(TAG_RE, input).length;
    const tagsOut = collect(TAG_RE, output).length;
    const classIn = collect(CLASS_RE, input).length;
    const classOut = collect(CLASS_RE, output).length;
    const idIn = collect(ID_RE, input).length;
    const idOut = collect(ID_RE, output).length;
    const hrefIn = collect(HREF_RE, input).length;
    const hrefOut = collect(HREF_RE, output).length;
    const srcIn = collect(SRC_RE, input).length;
    const srcOut = collect(SRC_RE, output).length;

    if (ratioChange(tagsIn, tagsOut) > 0.1) {
      warnings.push(`Text-node-only output tag count changed significantly (input ${tagsIn}, output ${tagsOut}).`);
    }
    if (ratioChange(classIn, classOut) > 0.1) {
      warnings.push(`Text-node-only output class count changed (input ${classIn}, output ${classOut}).`);
    }
    if (ratioChange(idIn, idOut) > 0.1) {
      warnings.push(`Text-node-only output id count changed (input ${idIn}, output ${idOut}).`);
    }
    if (ratioChange(hrefIn, hrefOut) > 0.1) {
      warnings.push(`Text-node-only output href count changed (input ${hrefIn}, output ${hrefOut}).`);
    }
    if (ratioChange(srcIn, srcOut) > 0.1) {
      warnings.push(`Text-node-only output src count changed (input ${srcIn}, output ${srcOut}).`);
    }
    if (output.length < input.length * 0.5) {
      warnings.push("Text-node-only output is much shorter than the input — content may be missing.");
    }
  }

  if (outputMode === "diff") {
    if (!hasDiffMarkers(output)) {
      warnings.push("Diff-mode output does not contain unified diff markers.");
    }
    if (looksLikeFullHtmlOrJsxFile(output)) {
      warnings.push("Diff-mode output looks like a full file rather than a patch.");
    }
  }

  return warnings;
}
