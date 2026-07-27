import crypto from "node:crypto";

export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const DEFAULT_TIMEOUT = Number(process.env.CRAWL_TIMEOUT_MS || 15000);
const RETRIES = Number(process.env.CRAWL_RETRIES || 1);
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function attempt(url: string, headers: Record<string, string>): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, ...headers },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} <- ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** One transient blip (timeout / 5xx / reset) shouldn't cost a source its day. */
async function request(url: string, headers: Record<string, string>): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= RETRIES; i++) {
    try {
      return await attempt(url, headers);
    } catch (e) {
      lastErr = e;
      // 4xx won't heal on retry — fail fast; retry timeouts / 5xx / network errors.
      const msg = String(e instanceof Error ? e.message : e);
      if (/HTTP 4\d\d/.test(msg)) break;
      if (i < RETRIES) await sleep(RETRY_DELAY_MS * (i + 1));
    }
  }
  throw lastErr;
}

export async function getText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const res = await request(url, headers);
  return res.text();
}

export async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await request(url, { Accept: "application/json", ...headers });
  return (await res.json()) as T;
}

/** Strip HTML tags + decode entities (named/numeric/hex) + collapse whitespace. */
export { cleanText as stripHtml } from "../../lib/text";

export function truncate(s: string, max = 160): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max).trimEnd() + "…";
}

/** Parse a variety of date formats to ISO; returns null when unparseable. */
export function toIso(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = String(input).trim().replace(/\s+/g, " ");
  // Normalize "2026-05-29 10:40:19 +0800" -> "2026-05-29T10:40:19+0800"
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})\s*([+-]\d{4})?$/);
  if (m) s = `${m[1]}T${m[2]}${m[3] ?? ""}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Fetch og:image from a page URL. Returns null on any failure (timeout, no meta, etc.). */
export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!m) return null;
    const img = m[1].trim();
    // https only — http images would be blocked as mixed content on the https site.
    if (!img.startsWith("https://")) return null;
    return img;
  } catch {
    return null;
  }
}

/** Stable short id derived from a string (used when a source has no id). */
export function hashId(prefix: string, seed: string): string {
  const h = crypto.createHash("sha1").update(seed).digest("hex").slice(0, 10);
  return `${prefix}-${h}`;
}
