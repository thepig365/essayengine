import { NextResponse } from "next/server";
import { callOpenAiTts, MAX_TTS_CHARS_PER_REQUEST, ttsContentType } from "@/lib/ttsServer";

export const runtime = "nodejs";

type TtsRequest = {
  text?: string;
  voice?: string;
  speed?: number;
  style?: string;
};

export async function POST(req: Request) {
  let body: TtsRequest;
  try {
    body = (await req.json()) as TtsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Missing required field: text." }, { status: 400 });
  }
  if (text.length > MAX_TTS_CHARS_PER_REQUEST) {
    return NextResponse.json(
      { error: "Text is too long to read aloud. Select a shorter section." },
      { status: 400 },
    );
  }

  try {
    const audio = await callOpenAiTts(text, {
      voice: body.voice,
      speed: body.speed,
      style: body.style,
    });
    return new Response(audio, {
      headers: {
        "content-type": ttsContentType(),
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OpenAI TTS request failed." },
      { status: 500 },
    );
  }
}
