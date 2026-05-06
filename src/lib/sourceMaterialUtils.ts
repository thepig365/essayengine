import type { SourceMaterialType, SourceSegment } from "@/types/sourceMaterial";

export function makeSourceSegmentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `seg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const YOUTUBE_RE = /^https?:\/\/(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?[^ ]*v=|shorts\/)|youtu\.be\/)[\w-]{11}/i;

export function detectMaterialKindFromUrl(url: string): SourceMaterialType {
  const trimmed = url.trim();
  let host = "";
  try {
    host = new URL(trimmed).hostname.toLowerCase();
  } catch {
    return "article";
  }

  if (YOUTUBE_RE.test(trimmed)) return "youtube";

  if (host.includes("linkedin.")) return "linkedin";

  if (
    host.includes("reddit.") ||
    host === "x.com" ||
    host.includes("twitter.") ||
    host.includes("threads.") ||
    host.includes("facebook.") ||
    host.includes("instagram.")
  ) {
    return "social_post";
  }

  if (
    host.includes("stackoverflow.") ||
    host.includes("stackexchange.") ||
    host.includes("ask.") ||
    host.includes("discuss.") ||
    host.includes("forum.")
  ) {
    return "stackback";
  }

  if (
    host.includes("spotify.") ||
    host.includes("podcasts.apple.") ||
    host.includes("pca.st") ||
    host.includes("buzzsprout.") ||
    host.includes("anchor.fm") ||
    host.includes("megaphone.fm")
  ) {
    return "podcast";
  }

  return "article";
}

export function labelForMaterialKind(kind: SourceMaterialType, locale: "en" | "zh" = "zh"): string {
  const zh: Record<SourceMaterialType, string> = {
    youtube: "YouTube 视频",
    podcast: "播客 / 音频网页",
    audio: "上传音频",
    linkedin: "LinkedIn",
    stackback: "论坛 / 问答帖",
    social_post: "社交媒体帖文",
    article: "网页文章",
    text: "粘贴文本",
    document: "文档 / 字幕文件",
  };
  const en: Record<SourceMaterialType, string> = {
    youtube: "YouTube video",
    podcast: "Podcast / audio page",
    audio: "Uploaded audio",
    linkedin: "LinkedIn",
    stackback: "Forum / Q&A thread",
    social_post: "Social post",
    article: "Web article",
    text: "Pasted text",
    document: "Document / captions file",
  };
  return locale === "zh" ? zh[kind] : en[kind];
}

function hoursMinutesToSeconds(h: number, m: number, s: number, frac = 0): number {
  return h * 3600 + m * 60 + s + frac;
}

/**
 * Parse a single timestamp on the left or right side of a cue arrow.
 * Supports SRT-style HH:MM:SS,mmm and WebVTT MM:SS.mmm / HH:MM:SS.mmm
 */
function parseTimestampToken(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  const full = t.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (full) {
    const h = Number(full[1]);
    const m = Number(full[2]);
    const s = Number(full[3]);
    const frac = full[4] ? Number(full[4].padEnd(3, "0")) / 1000 : 0;
    return hoursMinutesToSeconds(h, m, s, frac);
  }
  const short = t.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (short) {
    const mm = Number(short[1]);
    const ss = Number(short[2]);
    const frac = short[3] ? Number(short[3].padEnd(3, "0")) / 1000 : 0;
    return mm * 60 + ss + frac;
  }
  return null;
}

/** Parse cue line: "start --> end" (WebVTT may include settings after end time). */
export function parseCueTimestampLine(line: string): { start: number; end: number } | null {
  const cleaned = line.replace(/\s+/g, " ").trim();
  const arrowParts = cleaned.split(/-->/);
  if (arrowParts.length < 2) return null;
  const start = parseTimestampToken(arrowParts[0] ?? "");
  const endPart = (arrowParts[1] ?? "").trim().split(/\s+/)[0] ?? "";
  const end = parseTimestampToken(endPart);
  if (start === null || end === null) return null;
  return { start, end };
}

/** @deprecated use parseCueTimestampLine */
export function parseSrtTimestamp(line: string): { start: number; end: number } | null {
  return parseCueTimestampLine(line);
}

/** Minimal SRT-style parser; falls back to empty array if nothing matches. */
export function segmentsFromSrtContent(raw: string): SourceSegment[] {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  const blocks = normalized.split(/\n\s*\n+/);
  const out: SourceSegment[] = [];
  let index = 0;
  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    let li = 0;
    if (/^\d+$/.test(lines[0])) li = 1;
    const timeLine = lines[li];
    if (!timeLine) continue;
    const times = parseCueTimestampLine(timeLine);
    const textLines = lines.slice(li + 1);
    const text = textLines.join("\n").trim();
    if (!text) continue;
    if (times) {
      index += 1;
      out.push({
        id: makeSourceSegmentId(),
        startTime: times.start,
        endTime: times.end,
        label: `Cue ${index}`,
        text,
      });
    }
  }
  return out;
}

/** WebVTT cues: scan line-by-line for timing rows. */
export function segmentsFromVttContent(raw: string): SourceSegment[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: SourceSegment[] = [];
  let i = 0;
  let seenHeader = false;
  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";
    if (!seenHeader && line.toUpperCase().startsWith("WEBVTT")) {
      seenHeader = true;
      i += 1;
      continue;
    }
    if (line.includes("-->")) {
      const times = parseCueTimestampLine(line);
      i += 1;
      const textParts: string[] = [];
      while (i < lines.length && (lines[i]?.trim() ?? "") !== "") {
        const L = (lines[i] ?? "").trim();
        if (!L.startsWith("NOTE") && !L.includes("-->")) textParts.push(L);
        i += 1;
      }
      const text = textParts.join("\n").trim();
      if (times && text) {
        out.push({
          id: makeSourceSegmentId(),
          startTime: times.start,
          endTime: times.end,
          label: `Cue ${out.length + 1}`,
          text,
        });
      }
      continue;
    }
    i += 1;
  }
  return out;
}

export function splitPlainTextIntoParagraphBlocks(text: string, labelPrefix: string): SourceSegment[] {
  const chunks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (chunks.length <= 1 && text.trim()) {
    const long = text.trim();
    if (long.length > 4000) {
      const approx: string[] = [];
      let buf = "";
      for (const sentence of long.split(/(?<=[。！？.!?])\s+/)) {
        if ((buf + sentence).length > 900 && buf) {
          approx.push(buf.trim());
          buf = sentence;
        } else {
          buf = `${buf}${sentence}`;
        }
      }
      if (buf.trim()) approx.push(buf.trim());
      return approx.map((p, i) => ({
        id: makeSourceSegmentId(),
        label: `${labelPrefix} ${i + 1}`,
        text: p,
      }));
    }
  }

  return chunks.map((p, i) => ({
    id: makeSourceSegmentId(),
    label: `${labelPrefix} ${i + 1}`,
    text: p,
  }));
}

export function formatSecondsTimestamp(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = Math.floor(s % 60);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export type MaterialAnalysisTemplateParams = {
  sourceType: string;
  sourceMetadata: string;
  selectedMaterial: string;
  task: string;
};

export function buildMaterialAnalysisInstruction(p: MaterialAnalysisTemplateParams): string {
  return [
    "Use this rule for all source analysis:",
    "",
    "Only analyze the selected source material provided below.",
    "Do not use the full source unless explicitly selected by the user.",
    "Do not invent information not present in the selected material.",
    "If the selected material is too short or unclear, say so clearly.",
    "",
    `Selected source type:\n${p.sourceType}`,
    "",
    `Selected source metadata:\n${p.sourceMetadata}`,
    "",
    "Selected material:",
    p.selectedMaterial,
    "",
    "User task:",
    p.task,
  ].join("\n");
}

export const MATERIAL_WRITING_SUPPLEMENT = [
  "Writing constraint:",
  "Only use the Source Capture text and any saved topic material (题材) provided in the user instructions as factual source material.",
  "Ignore content that the user did not place in Source Capture unless they clearly asked to rely on outside knowledge.",
  "Do not invent facts not supported by that source material.",
].join("\n");

export const MATERIAL_ANALYSIS_BUTTONS: { label: string; task: string }[] = [
  { label: "提取主要观点", task: "提取主要观点：分条列出，仅使用已选素材中的表述。" },
  { label: "如何支持观点", task: "说明素材里如何支持核心观点：只引用已有论据与事实，不要编造。" },
  { label: "中心内容", task: "概括中心内容：简短准确，仅基于已选素材。" },
  { label: "提取金句", task: "提取可用于引用的金句（原句或接近原句），标注出自哪句上下文。" },
  { label: "提取故事素材", task: "提取可用于叙事的故事素材：场景、冲突、转折、结局要素，仅限素材中有的信息。" },
  { label: "提取论点", task: "提取论点与立场：区分事实与推断，不要补充素材未提及的主张。" },
  { label: "提取案例", task: "提取案例与例证：说明人物/事件/数据，若素材未给出则注明未知。" },
  { label: "提取情绪线索", task: "提取情绪线索与语气走向：用于写作时需对应到文本依据。" },
  { label: "转成题材", task: "把已选素材整理成可复用的写作题材条目（主题、角度、受众、要点清单）。" },
  { label: "生成写作方向", task: "基于已选素材给出 3–5 个具体写作方向标题+一句立意，不得引入素材外主题。" },
];
