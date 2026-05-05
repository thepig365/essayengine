import { lookup } from "node:dns/promises";
import net from "node:net";
import { NextResponse } from "next/server";
import { extractReadableWebpage } from "@/engine/fetchWebpage";

export const runtime = "nodejs";

const MAX_LINK_RESPONSE_BYTES = 1_500_000;
const LINK_FETCH_TIMEOUT_MS = 8_000;

type ExtractLinkRequest = {
  url?: string;
};

function isPrivateIp(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;

  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }
  if (ipVersion === 6) {
    return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
  }
  return false;
}

async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }
  if (isPrivateIp(parsed.hostname)) {
    throw new Error("Localhost and private network URLs are not allowed.");
  }

  const hostIsIp = net.isIP(parsed.hostname) !== 0;
  if (!hostIsIp) {
    const addresses = await lookup(parsed.hostname, { all: true }).catch(() => []);
    if (addresses.some((address) => isPrivateIp(address.address))) {
      throw new Error("Private network URLs are not allowed.");
    }
  }

  return parsed;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const n = Number.parseInt(code, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    });
}

function extractTitle(html: string): string {
  const ogTitle = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1];
  const title = ogTitle ?? html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return decodeHtmlEntities((title ?? "").replace(/\s+/g, " ").trim());
}

function extractSiteName(html: string): string | undefined {
  const value = html.match(/<meta\b[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1];
  const siteName = decodeHtmlEntities((value ?? "").replace(/\s+/g, " ").trim());
  return siteName || undefined;
}

function excerptFrom(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 600) return normalized;
  return `${normalized.slice(0, 600).trimEnd()}...`;
}

function contentTypeFor(url: URL): "webpage" | "youtube" | "unknown" {
  const host = url.hostname.toLowerCase();
  if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
  return "webpage";
}

async function readLimitedText(response: Response): Promise<{ text: string; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { text: await response.text(), truncated: false };

  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    size += value.byteLength;
    if (size > MAX_LINK_RESPONSE_BYTES) {
      truncated = true;
      const remaining = MAX_LINK_RESPONSE_BYTES - (size - value.byteLength);
      if (remaining > 0) chunks.push(value.slice(0, remaining));
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return { text: new TextDecoder().decode(Buffer.concat(chunks)), truncated };
}

export async function POST(req: Request) {
  let body: ExtractLinkRequest;
  try {
    body = (await req.json()) as ExtractLinkRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing required field: url." }, { status: 400 });
  }

  let url: URL;
  try {
    url = await assertSafePublicUrl(rawUrl);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid URL." }, { status: 400 });
  }

  const warnings: string[] = [];
  const kind = contentTypeFor(url);
  if (kind === "youtube") {
    warnings.push("YouTube link detected. This route only extracts page text; use the Transcript Workspace for video transcripts.");
  }

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; EssayEngine/1.0; +https://example.com/bot)",
        accept: "text/html,application/xhtml+xml,text/plain",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(LINK_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Could not fetch link (${response.status}).` }, { status: 502 });
    }

    const responseType = response.headers.get("content-type") ?? "";
    if (!responseType.includes("text/") && !responseType.includes("application/xhtml")) {
      return NextResponse.json({ error: "Link did not return readable text or HTML." }, { status: 415 });
    }

    const { text: html, truncated: responseTruncated } = await readLimitedText(response);
    const source = extractReadableWebpage(html);
    if (responseTruncated || source.truncated) warnings.push("Source text was truncated for safety.");
    if (!source.content.trim()) warnings.push("Only thin readable text could be extracted from this page.");

    return NextResponse.json({
      url: url.toString(),
      title: extractTitle(html) || url.hostname,
      text: source.content,
      excerpt: excerptFrom(source.content),
      siteName: extractSiteName(html),
      contentType: kind,
      warnings,
    });
  } catch (err) {
    const message = err instanceof Error && err.name === "TimeoutError"
      ? "Link fetch timed out."
      : err instanceof Error
        ? err.message
        : "Link extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
