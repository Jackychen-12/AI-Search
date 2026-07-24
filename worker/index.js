/**
 * Cloudflare Worker — DeepSeek API proxy for AI Search
 *
 * Environment variables (set in Cloudflare dashboard / wrangler.toml):
 *   DEEPSEEK_API_KEY      — your DeepSeek API key (secret)
 *   ALLOWED_ORIGINS       — comma-separated origin allowlist,
 *                           e.g. "https://aisearches.cc,https://you.github.io"
 *   ALLOW_NO_RATE_LIMIT   — set "1" to serve without a RATE_KV binding (not recommended)
 *
 * Hardening:
 *   - Origin must EXACTLY match an allowlisted origin (no startsWith/includes —
 *     those are bypassable via e.g. "https://allowed.tld.evil.com"). Requests
 *     without an allowed Origin are rejected outright.
 *   - localhost/127.0.0.1 on any port is allowed for local dev only.
 *   - The client body is never forwarded as-is: only `messages` is taken, and
 *     model / max_tokens / temperature / stream are pinned server-side so a
 *     caller can't run expensive models or huge completions on your key.
 *   - Per-IP rate limiting via CF KV. Without the KV binding the worker fails
 *     closed (503) instead of silently serving unlimited traffic.
 */

const DEEPSEEK_BASE = "https://api.deepseek.com";
const DEFAULT_ALLOWED_ORIGINS = ["https://aisearches.cc"];
const LOCAL_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const MODEL = "deepseek-chat"; // pinned; the client cannot choose
const MAX_TOKENS = 1024;
const MAX_MESSAGES = 8;
const MAX_BODY_BYTES = 16384;

const RATE_LIMIT = 20; // max requests per window
const RATE_WINDOW = 3600; // window in seconds (1 hour)

function allowedOrigins(env) {
  const raw = env.ALLOWED_ORIGINS || "";
  const list = raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_ALLOWED_ORIGINS;
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  if (LOCAL_DEV_ORIGIN.test(origin)) return true;
  return allowedOrigins(env).includes(origin);
}

/** CORS headers echo the origin only after it passed the exact-match check. */
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(origin ? corsHeaders(origin) : {}),
    },
  });
}

async function checkRateLimit(ip, env) {
  const key = `rl:${ip}`;
  const val = await env.RATE_KV.get(key);
  const count = val ? parseInt(val, 10) : 0;
  if (count >= RATE_LIMIT) return false;
  await env.RATE_KV.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
  return true;
}

/** Keep only role/content string pairs; reject anything else. */
function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") return null;
    if (m.role !== "system" && m.role !== "user" && m.role !== "assistant") return null;
    if (typeof m.content !== "string") return null;
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const originOk = isAllowedOrigin(origin, env);

    // CORS preflight — only meaningful for allowed origins.
    if (request.method === "OPTIONS") {
      if (!originOk) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Browser-only endpoint: an allowlisted Origin is mandatory.
    if (!originOk) {
      return jsonResponse({ error: "Forbidden" }, 403, null);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, origin);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/v1/chat/completions") {
      return jsonResponse({ error: "Not found" }, 404, origin);
    }

    // Rate limit by IP — fail closed when the KV binding is missing.
    if (env.RATE_KV) {
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const allowed = await checkRateLimit(ip, env);
      if (!allowed) {
        return jsonResponse(
          { error: "请求过于频繁，请稍后再试。每小时最多 " + RATE_LIMIT + " 次。" },
          429,
          origin,
        );
      }
    } else if (env.ALLOW_NO_RATE_LIMIT !== "1") {
      return jsonResponse(
        { error: "Rate limiting not configured (bind RATE_KV, see wrangler.toml)" },
        503,
        origin,
      );
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request too large" }, 413, origin);
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400, origin);
    }
    const messages = sanitizeMessages(parsed?.messages);
    if (!messages) {
      return jsonResponse({ error: "Invalid messages" }, 400, origin);
    }

    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return jsonResponse({ error: "API key not configured" }, 500, origin);
    }

    // Rebuild the upstream payload — client-supplied model/params are ignored.
    const upstream = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        messages,
      }),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        ...corsHeaders(origin),
      },
    });
  },
};
