export const MAX_TTS_CHARS_PER_REQUEST = 5000;
export const TTS_CHUNK_CHARS = 4500;
export const MAX_TOTAL_TTS_CHARS = 50000;

const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_TTS_VOICE = "echo";
const DEFAULT_TTS_FORMAT = "mp3";

export type TtsOptions = {
  voice?: string;
  speed?: number;
  style?: string;
};

function appendToken(chunks: string[], current: string, token: string, maxChars: number): string {
  const trimmed = token.trim();
  if (!trimmed) return current;

  if (trimmed.length > maxChars) {
    if (current.trim()) chunks.push(current.trim());
    for (let i = 0; i < trimmed.length; i += maxChars) {
      chunks.push(trimmed.slice(i, i + maxChars).trim());
    }
    return "";
  }

  const next = current ? `${current} ${trimmed}` : trimmed;
  if (next.length > maxChars) {
    if (current.trim()) chunks.push(current.trim());
    return trimmed;
  }
  return next;
}

export function splitTextForTts(text: string, maxChars = TTS_CHUNK_CHARS): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let current = "";
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      current = appendToken(chunks, current, paragraph, maxChars);
      continue;
    }

    const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [paragraph];
    for (const sentence of sentences) {
      current = appendToken(chunks, current, sentence, maxChars);
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function callOpenAiTts(text: string, options: TtsOptions = {}): Promise<ArrayBuffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const payload: Record<string, unknown> = {
    model: process.env.OPENAI_TTS_MODEL || DEFAULT_TTS_MODEL,
    input: text,
    voice: options.voice || process.env.OPENAI_TTS_VOICE || DEFAULT_TTS_VOICE,
    response_format: process.env.OPENAI_TTS_FORMAT || DEFAULT_TTS_FORMAT,
    speed: typeof options.speed === "number" ? options.speed : 1,
  };

  const style = (options.style ?? "").trim();
  if (style) {
    payload.instructions = `Read in a ${style} tone.`;
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `OpenAI TTS request failed (${response.status}).`);
  }

  return response.arrayBuffer();
}

export function ttsContentType(): string {
  const responseFormat = process.env.OPENAI_TTS_FORMAT || DEFAULT_TTS_FORMAT;
  return responseFormat === "mp3" ? "audio/mpeg" : `audio/${responseFormat}`;
}
