import type { TranscriptSegment, YouTubeTranscript } from "@/types/engine";
import { YoutubeTranscript } from "youtube-transcript";

export const TRANSCRIPT_UNAVAILABLE_MESSAGE =
  "Transcript unavailable. This video may not have captions, captions may be disabled, or YouTube may be blocking transcript access.";

export function extractYouTubeVideoId(url: string): string | null {
  const patterns: RegExp[] = [
    /youtube\.com\/watch\?(?:[^ ]*&)?v=([\w-]{11})/i,
    /youtu\.be\/([\w-]{11})/i,
    /youtube\.com\/shorts\/([\w-]{11})/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

function normalizeSegmentTiming(offset: number, duration: number): { start: number; duration?: number } {
  const valuesLookLikeMilliseconds = duration > 300;
  return {
    start: valuesLookLikeMilliseconds ? offset / 1000 : offset,
    duration: valuesLookLikeMilliseconds ? duration / 1000 : duration,
  };
}

export async function getYouTubeTranscript(url: string): Promise<YouTubeTranscript> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return { videoId: "", text: "", segments: [] };
  }

  try {
    let segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }).catch(() => null);
    if (!segments || segments.length === 0) {
      segments = await YoutubeTranscript.fetchTranscript(videoId).catch(() => null);
    }
    if (!segments || segments.length === 0) {
      return { videoId, text: "", segments: [] };
    }
    const transcriptSegments: TranscriptSegment[] = segments.map((s) => {
      const timing = normalizeSegmentTiming(s.offset, s.duration);
      return {
        start: timing.start,
        duration: timing.duration,
        text: s.text.replace(/\s+/g, " ").trim(),
      };
    });
    const text = transcriptSegments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
    return { videoId, text, segments: transcriptSegments };
  } catch {
    return { videoId, text: "", segments: [] };
  }
}
