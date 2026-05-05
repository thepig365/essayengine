import type { InputType } from "@/types/engine";

const YOUTUBE_PATTERNS = [
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?[^ ]*v=[\w-]+/i,
  /^https?:\/\/youtu\.be\/[\w-]+/i,
  /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/[\w-]+/i,
];

function isYouTubeUrl(s: string): boolean {
  return YOUTUBE_PATTERNS.some((re) => re.test(s));
}

function isUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s);
}

function isJson(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

function looksLikeReact(s: string): boolean {
  return (
    s.includes("className=") ||
    /export\s+default\s+/.test(s) ||
    /["']use client["']/.test(s) ||
    /<[A-Z][A-Za-z0-9]*[\s/>]/.test(s)
  );
}

function looksLikeTsx(s: string): boolean {
  if (!looksLikeReact(s)) return false;
  return (
    /:\s*(string|number|boolean|React\.\w+|JSX\.\w+|[A-Z]\w*)\b/.test(s) ||
    /\binterface\s+\w+/.test(s) ||
    /\btype\s+\w+\s*=/.test(s) ||
    /<[A-Za-z]\w*<[^>]+>/.test(s) ||
    /\bas\s+\w+/.test(s)
  );
}

function looksLikeHtml(s: string): boolean {
  return /<(html|body|section|div|h1|p|article|main|header|footer|nav)\b/i.test(s);
}

function looksLikeMarkdown(s: string): boolean {
  return (
    /^#{1,6}\s+/m.test(s) ||
    /^\s*[-*+]\s+/m.test(s) ||
    /\[[^\]]+\]\([^)]+\)/.test(s) ||
    /^```/m.test(s) ||
    /^\s*\d+\.\s+/m.test(s)
  );
}

export function detectInputType(input: string): InputType {
  const trimmed = input?.trim() ?? "";
  if (trimmed.length === 0) return "unknown";

  if (isYouTubeUrl(trimmed)) return "youtube_url";
  if (isUrl(trimmed)) return "url";
  if (isJson(trimmed)) return "json";
  if (looksLikeTsx(trimmed)) return "tsx";
  if (looksLikeReact(trimmed)) return "jsx";
  if (looksLikeHtml(trimmed)) return "html";
  if (looksLikeMarkdown(trimmed)) return "markdown";

  return "plain_text";
}
