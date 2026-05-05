const MAX_WEBPAGE_CHARS = 30_000;
const TRUNCATION_NOTE = "\n\n[Content truncated for model safety.]";

export type WebpageSource = {
  content: string;
  truncated: boolean;
};

export async function fetchWebpageText(url: string): Promise<string> {
  const source = await fetchWebpageSource(url);
  return source.content;
}

export async function fetchWebpageSource(url: string): Promise<WebpageSource> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; EssayEngine/1.0; +https://example.com/bot)",
        accept: "text/html,application/xhtml+xml,text/plain",
      },
      redirect: "follow",
    });
    if (!res.ok) return { content: "", truncated: false };
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/") && !contentType.includes("application/xhtml")) {
      return { content: "", truncated: false };
    }

    const html = await res.text();
    return extractReadableWebpage(html);
  } catch {
    return { content: "", truncated: false };
  }
}

export function extractReadableWebpage(html: string): WebpageSource {
  const cleanedHtml = cleanHtml(html);
  const mainHtml = selectMainContent(cleanedHtml);
  const readable = normalizeReadableText(markdownishFromHtml(mainHtml));
  const cleanedBodyText = normalizeReadableText(textFromHtml(selectBody(cleanedHtml)));
  const cleanedHtmlFallback = normalizeReadableText(textFromHtml(cleanedHtml));

  const best =
    readable.length >= 400
      ? readable
      : cleanedBodyText.length >= 200
        ? cleanedBodyText
        : cleanedHtmlFallback;

  return limitContent(best);
}

function cleanHtml(html: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
  s = s.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "");
  s = s.replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi, "");
  s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  s = s.replace(/<link\b[^>]*\/?>/gi, "");
  s = s.replace(/<meta\b[^>]*\/?>/gi, "");
  s = s.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, "");
  s = s.replace(/<[^>]*\btype=["']application\/(?:ld\+json|json)["'][^>]*>[\s\S]*?<\/[^>]+>/gi, "");
  s = s.replace(/<[^>]*\bid=["'][^"']*(?:__NEXT_DATA__|webpack|gtm|analytics|tracking)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, "");
  s = s.replace(/<[^>]*\bclass=["'][^"']*(?:gtm|analytics|tracking|cookie|consent|advert|ad-|ads)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, "");
  return s.trim();
}

function selectMainContent(html: string): string {
  const selectors = [
    /<main\b[^>]*>([\s\S]*?)<\/main>/gi,
    /<article\b[^>]*>([\s\S]*?)<\/article>/gi,
    /<[^>]+\brole=["']main["'][^>]*>([\s\S]*?)<\/[^>]+>/gi,
    /<[^>]+\bclass=["'][^"']*(?:content|post|entry-content|article)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi,
  ];

  let best = "";
  for (const selector of selectors) {
    const matches = [...html.matchAll(selector)].map((m) => m[1] ?? "");
    for (const match of matches) {
      if (textFromHtml(match).length > textFromHtml(best).length) {
        best = match;
      }
    }
    if (textFromHtml(best).length >= 400) return best;
  }

  return selectBody(html);
}

function selectBody(html: string): string {
  return html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
}

function markdownishFromHtml(html: string): string {
  const parts: string[] = [];
  const blockRe = /<(h1|h2|h3|p|li|blockquote|figcaption|table)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const text = normalizeInlineText(match[2]);
    if (!text) continue;

    if (tag === "h1") parts.push(`# ${text}`);
    else if (tag === "h2") parts.push(`## ${text}`);
    else if (tag === "h3") parts.push(`### ${text}`);
    else if (tag === "li") parts.push(`- ${text}`);
    else parts.push(text);
  }

  if (parts.length > 0) return parts.join("\n\n");
  return textFromHtml(html);
}

function textFromHtml(html: string): string {
  return normalizeInlineText(
    html
      .replace(/<\/(?:h1|h2|h3|p|li|blockquote|figcaption|tr|table|div|section|article|main)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n"),
  );
}

function normalizeInlineText(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function normalizeReadableText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
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

function limitContent(content: string): WebpageSource {
  if (content.length <= MAX_WEBPAGE_CHARS) return { content, truncated: false };

  const boundary = content.lastIndexOf("\n\n", MAX_WEBPAGE_CHARS - TRUNCATION_NOTE.length);
  const cutAt = boundary > MAX_WEBPAGE_CHARS * 0.5 ? boundary : MAX_WEBPAGE_CHARS - TRUNCATION_NOTE.length;
  return {
    content: content.slice(0, cutAt).trimEnd() + TRUNCATION_NOTE,
    truncated: true,
  };
}
