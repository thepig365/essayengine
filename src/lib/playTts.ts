export type PlayTtsOptions = {
  voice?: string;
  speed?: number;
  style?: string;
};

export const TTS_CHUNK_CHARS = 4500;
export const MAX_TOTAL_TTS_CHARS = 50000;

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

async function fetchTtsBlob(text: string, options: PlayTtsOptions): Promise<Blob> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, ...options }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `Audio generation failed (${response.status}).`);
  }

  return response.blob();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function playBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Audio playback failed."));
    };
    audio.play().catch((err: unknown) => {
      URL.revokeObjectURL(url);
      reject(err instanceof Error ? err : new Error("Audio playback failed."));
    });
  });
}

function validateTextForLongTts(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("No text to read.");
  }
  if (trimmed.length > MAX_TOTAL_TTS_CHARS) {
    throw new Error("Text is too long for one audio export. Please select a shorter section.");
  }
  return trimmed;
}

export async function playTts(text: string, options: PlayTtsOptions = {}): Promise<void> {
  const blob = await fetchTtsBlob(text, options);
  await playBlob(blob);
}

export async function playTtsLong(
  text: string,
  options: PlayTtsOptions = {},
  onProgress?: (message: string) => void,
): Promise<void> {
  const trimmed = validateTextForLongTts(text);
  const chunks = splitTextForTts(trimmed);

  for (let i = 0; i < chunks.length; i += 1) {
    onProgress?.(`Playing part ${i + 1} of ${chunks.length}`);
    try {
      const blob = await fetchTtsBlob(chunks[i], options);
      await playBlob(blob);
    } catch {
      throw new Error(`Audio generation failed at part ${i + 1} of ${chunks.length}.`);
    }
  }
}

export async function downloadTtsParts(
  text: string,
  options: PlayTtsOptions = {},
  baseFilename: string,
  onProgress?: (message: string) => void,
): Promise<void> {
  const trimmed = validateTextForLongTts(text);
  const chunks = splitTextForTts(trimmed);

  for (let i = 0; i < chunks.length; i += 1) {
    onProgress?.(`Preparing MP3 part ${i + 1} of ${chunks.length}`);
    try {
      const blob = await fetchTtsBlob(chunks[i], options);
      downloadBlob(blob, `${baseFilename}-part-${i + 1}.mp3`);
    } catch {
      throw new Error(`Audio generation failed at part ${i + 1} of ${chunks.length}.`);
    }
  }
  onProgress?.("Downloaded audio parts.");
}

export async function downloadMergedTts(
  text: string,
  options: PlayTtsOptions = {},
  filename: string,
  onProgress?: (message: string) => void,
): Promise<void> {
  const trimmed = validateTextForLongTts(text);
  onProgress?.("Preparing MP3...");

  const response = await fetch("/api/tts/merge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: trimmed, ...options }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Merged MP3 failed. Try downloading audio parts.");
  }

  onProgress?.("Downloading audio...");
  const blob = await response.blob();
  downloadBlob(blob, filename);
  onProgress?.("Downloaded merged MP3.");
}
