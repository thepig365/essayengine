import { NextResponse } from "next/server";
import { getYouTubeTranscript, TRANSCRIPT_UNAVAILABLE_MESSAGE } from "@/engine/youtubeTranscript";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = (body?.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "Missing required field: url." }, { status: 400 });
  }

  const transcript = await getYouTubeTranscript(url);
  const warnings: string[] = [];
  if (!transcript.text) {
    warnings.push(TRANSCRIPT_UNAVAILABLE_MESSAGE);
  } else if (transcript.text.length < 100) {
    warnings.push("Transcript is very short (fewer than 100 characters).");
  }

  return NextResponse.json({
    videoId: transcript.videoId,
    text: transcript.text,
    segments: transcript.segments,
    warnings,
  });
}
