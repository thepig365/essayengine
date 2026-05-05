import type { EngineRequest, InputType, ResolvedOutputMode } from "@/types/engine";

const MODE_INSTRUCTIONS: Record<ResolvedOutputMode, string> = {
  content_only: [
    "OUTPUT MODE: content_only",
    "- Transform the input according to the task.",
    "- Preserve meaning.",
    "- Improve clarity where appropriate.",
    "- Markdown formatting is allowed.",
    "- Do not preserve any source-format scaffolding (HTML tags, JSX, JSON keys) unless the task requires it.",
    "- Do not include commentary, preamble, or explanation unless explicitly requested.",
  ].join("\n"),

  same_format: [
    "OUTPUT MODE: same_format",
    "- Preserve the original format exactly.",
    "- Do NOT convert HTML to markdown.",
    "- Do NOT convert JSX/TSX to plain text.",
    "- Do NOT convert markdown to HTML.",
    "- Preserve all tags, attributes, class names, IDs, links, component names, and structure.",
    "- Rewrite ONLY human-readable user-facing text unless structural changes are explicitly requested.",
    "- Do not remove or add elements unless explicitly requested.",
    "- Output the transformed content only — no commentary, no preamble.",
  ].join("\n"),

  text_node_only: [
    "OUTPUT MODE: text_node_only",
    "",
    "You are editing code/markup.",
    "Preserve the file structure exactly.",
    "",
    "DO NOT change:",
    "- tag names",
    "- component names",
    "- imports",
    "- exports",
    "- props",
    "- variables",
    "- functions",
    "- logic",
    "- attributes",
    "- class names",
    "- IDs",
    "- URLs",
    "- routes",
    "- inline styles",
    "- scripts",
    "- event handlers",
    "- data attributes",
    "- aria attributes",
    "- comments",
    "- formatting unrelated to visible text",
    "",
    "ONLY change:",
    "- visible user-facing text nodes",
    "- text between tags",
    "- string literals clearly rendered as user-facing copy",
    "",
    "Do NOT translate or rewrite:",
    "- variable names",
    "- prop names",
    "- object keys",
    "- routes",
    "- filenames",
    "- class names",
    "- CSS tokens",
    "- URLs",
    "- IDs",
    "",
    "Output the complete transformed file/content only.",
    "No commentary.",
  ].join("\n"),

  diff: [
    "OUTPUT MODE: diff",
    "- Output a unified diff only.",
    "- Do NOT output the full file.",
    "- Do NOT include explanations.",
    "- Include only changed lines and minimal necessary context.",
    "- Use standard diff markers (`-` for removed lines, `+` for added lines).",
    "- Do NOT wrap the output in markdown code fences.",
  ].join("\n"),

  structured_data: [
    "OUTPUT MODE: structured_data",
    "- Output VALID JSON only.",
    "- Do NOT wrap the output in markdown code fences.",
    "- Do NOT include comments.",
    "- Do NOT include trailing commas.",
    "- Use stable snake_case keys.",
    "- Include empty string or empty array for unavailable fields instead of omitting important keys.",
    "- Extract reusable content fields where applicable, such as:",
    "  - title",
    "  - subtitle",
    "  - summary",
    "  - sections",
    "  - cta",
    "  - metadata",
    "- Do not include any text outside the JSON object.",
  ].join("\n"),
};

const TASK_INSTRUCTIONS: Record<string, string> = {
  translate: "Translate the input.",
  paraphrase: "Paraphrase the input while preserving meaning.",
  rewrite: "Rewrite the input for clarity and quality.",
  summarize: "Summarize the input concisely.",
  extract: "Extract the key information from the input.",
  improve: "Improve the input — clarity, flow, and quality — without changing intent.",
};

export function buildPrompt(
  request: EngineRequest,
  inputType: InputType,
  resolvedMode: ResolvedOutputMode,
): string {
  const lines: string[] = [];

  lines.push("You are a content transformation engine.");
  lines.push("");
  lines.push(`TASK: ${TASK_INSTRUCTIONS[request.task] ?? request.task}`);
  lines.push(`INPUT TYPE: ${inputType}`);
  lines.push(`RESOLVED OUTPUT MODE: ${resolvedMode}`);

  if (request.sourceLanguage) lines.push(`SOURCE LANGUAGE: ${request.sourceLanguage}`);
  if (request.targetLanguage) lines.push(`TARGET LANGUAGE: ${request.targetLanguage}`);
  if (request.tone) lines.push(`TONE: ${request.tone}`);
  if (request.userInstruction && request.userInstruction.trim()) {
    lines.push(`USER INSTRUCTION: ${request.userInstruction.trim()}`);
  }

  lines.push("");
  lines.push(MODE_INSTRUCTIONS[resolvedMode]);
  lines.push("");
  lines.push(
    "CRITICAL: Do not add commentary, preamble, explanation, or markdown wrapping unless explicitly required by the selected output mode.",
  );
  lines.push("");
  lines.push("INPUT:");
  lines.push(request.input);

  return lines.join("\n");
}
