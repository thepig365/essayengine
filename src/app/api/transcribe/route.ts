import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

type OpenAiTranscriptionResponse = {
  text?: string;
  duration?: number;
  [key: string]: unknown;
};

type OpenAiErrorResponse = {
  error?: {
    message?: string;
  };
};

function safeFilename(name: string, mimeType: string): string {
  const cleaned = name.trim().replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  if (cleaned) return cleaned;
  if (mimeType.includes("mp4")) return "voice-capture.m4a";
  if (mimeType.includes("mpeg")) return "voice-capture.mp3";
  if (mimeType.includes("wav")) return "voice-capture.wav";
  return "voice-capture.webm";
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Missing required audio file." }, { status: 400 });
  }

  const mimeType = (formData.get("mimeType")?.toString() || audio.type || "").trim();
  if (!mimeType.startsWith("audio/")) {
    return NextResponse.json({ error: "Unsupported file type. Upload an audio file." }, { status: 400 });
  }
  if (audio.size <= 0) {
    return NextResponse.json({ error: "Audio file is empty." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio file is too large for transcription." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  const filename = safeFilename(formData.get("filename")?.toString() || audio.name || "", mimeType);
  const upstreamForm = new FormData();
  upstreamForm.set("file", new File([audio], filename, { type: mimeType }));
  upstreamForm.set("model", process.env.OPENAI_STT_MODEL || "whisper-1");
  upstreamForm.set("response_format", "json");

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      body: upstreamForm,
    });

    const data = (await response.json().catch(() => null)) as OpenAiTranscriptionResponse | OpenAiErrorResponse | null;
    if (!response.ok) {
      const errorData = data as OpenAiErrorResponse | null;
      const message = errorData?.error?.message;
      return NextResponse.json({ error: message || `OpenAI transcription failed (${response.status}).` }, { status: 500 });
    }

    const transcription = data as OpenAiTranscriptionResponse | null;
    const text = typeof transcription?.text === "string" ? transcription.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Transcription returned no text." }, { status: 502 });
    }

    return NextResponse.json({
      text,
      durationSeconds: typeof transcription?.duration === "number" ? transcription.duration : undefined,
      provider: "openai",
      raw: transcription,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription request failed." },
      { status: 500 },
    );
  }
}
