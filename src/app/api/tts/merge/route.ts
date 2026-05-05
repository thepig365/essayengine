import { NextResponse } from "next/server";
import {
  callOpenAiTts,
  MAX_TOTAL_TTS_CHARS,
  splitTextForTts,
  TTS_CHUNK_CHARS,
  ttsContentType,
} from "@/lib/ttsServer";

export const runtime = "nodejs";

type MergeTtsRequest = {
  text?: string;
  voice?: string;
  speed?: number;
  style?: string;
};

export async function POST(req: Request) {
  let body: MergeTtsRequest;
  try {
    body = (await req.json()) as MergeTtsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Missing required field: text." }, { status: 400 });
  }
  if (text.length > MAX_TOTAL_TTS_CHARS) {
    return NextResponse.json(
      { error: "Text is too long for one audio export. Please select a shorter section." },
      { status: 400 },
    );
  }

  try {
    const chunks = splitTextForTts(text, TTS_CHUNK_CHARS);
    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const audio = await callOpenAiTts(chunk, {
        voice: body.voice,
        speed: body.speed,
        style: body.style,
      });
      buffers.push(Buffer.from(audio));
    }

    return new Response(Buffer.concat(buffers), {
      headers: {
        "content-type": ttsContentType(),
        "content-disposition": 'attachment; filename="essayengine-audio.mp3"',
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Merged MP3 failed. Try downloading audio parts." },
      { status: 500 },
    );
  }
}
