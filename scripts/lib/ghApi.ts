import { GH_PERIODS, GH_PERIOD_DAYS, type GhPeriod } from "../../lib/ghTrending";
import { UA } from "./fetchUtil";

// Thin GitHub REST helpers for the trends crawler. Works without a token
// (search: 10 req/min, core: 60 req/h) and just goes faster with one — CI
// passes GITHUB_TOKEN.

const TOKEN = process.env.GITHUB_TOKEN || "";
/** Search API is rate-limited per minute; space calls so we never hit 403. */
const SEARCH_GAP_MS = TOKEN ? 2200 : 6500;

export interface ApiRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  created_at: string;
  topics?: string[];
  archived?: boolean;
  fork?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function headers(accept = "application/vnd.github+json"): Record<string, string> {
  const h: Record<string, string> = { Accept: accept, "User-Agent": UA, "X-GitHub-Api-Version": "2022-11-28" };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

/**
 * GET with retries: network blips / 5xx back off and retry; a rate-limit 403/429
 * waits for the reset when it's close (search resets every minute), otherwise fails.
 */
async function ghJson<T>(url: string, accept?: string, attempt = 0): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(url, { headers: headers(accept), signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    if (attempt < 2) {
      await sleep(2000 * (attempt + 1));
      return ghJson<T>(url, accept, attempt + 1);
    }
    throw e;
  }
  clearTimeout(timer);
  if (res.ok) return (await res.json()) as T;
  const reset = Number(res.headers.get("x-ratelimit-reset") || 0) * 1000;
  const limited = (res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0";
  const waitMs = reset - Date.now() + 1000;
  if (limited && attempt < 2 && waitMs > 0 && waitMs < 70_000) {
    await sleep(waitMs);
    return ghJson<T>(url, accept, attempt + 1);
  }
  if (res.status >= 500 && attempt < 2) {
    await sleep(2000 * (attempt + 1));
    return ghJson<T>(url, accept, attempt + 1);
  }
  throw new Error(`HTTP ${res.status} <- ${url.replace(/\?.*/, "")}`);
}

let lastSearch = 0;
async function search(q: string, extra = ""): Promise<ApiRepo[]> {
  const wait = lastSearch + SEARCH_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastSearch = Date.now();
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=100${extra}`;
  const data = await ghJson<{ items?: ApiRepo[] }>(url);
  return data.items ?? [];
}

/**
 * Metadata for many repos in few calls: the search API ORs `repo:` qualifiers,
 * and a query may be up to 256 chars — ~8 repos per request instead of one
 * REST call each. Unknown / renamed repos are simply absent from the map.
 */
export async function lookupRepos(fullNames: string[]): Promise<Map<string, ApiRepo>> {
  const out = new Map<string, ApiRepo>();
  const batches: string[][] = [];
  let cur: string[] = [];
  let len = 0;
  for (const n of fullNames) {
    const part = `repo:${n}`;
    if (cur.length > 0 && len + part.length + 1 > 250) {
      batches.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(part);
    len += part.length + 1;
  }
  if (cur.length) batches.push(cur);
  // Two passes: a batch that failed on a network blip gets one more try at the end.
  for (let pass = 0; pass < 2 && batches.length; pass++) {
    const failed: string[][] = [];
    for (const b of batches) {
      try {
        for (const r of await search(b.join(" "))) out.set(r.full_name.toLowerCase(), r);
      } catch (e) {
        failed.push(b);
        if (pass === 1) console.log(`[gh-api] lookup batch failed: ${String(e instanceof Error ? e.message : e).slice(0, 80)}`);
      }
    }
    batches.splice(0, batches.length, ...failed);
  }
  return out;
}

/** New repos (created in the last `days`) matching `q`, most-starred first. */
export async function discoverRepos(q: string, days: number, minStars: number, limit: number): Promise<ApiRepo[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const items = await search(`${q} created:>${since} stars:>=${minStars} fork:false archived:false`, "&sort=stars&order=desc");
  return items.slice(0, limit);
}

/**
 * Exact stars gained per window, counted from stargazer timestamps (newest
 * pages first). A window is only reported when the fetched pages fully cover
 * it — otherwise it stays undefined rather than being guessed.
 * Costs 1..maxPages core-API calls.
 */
export async function starGains(
  fullName: string,
  stars: number,
  maxPages: number,
  now = Date.now(),
): Promise<{ gained: Partial<Record<GhPeriod, number>>; calls: number }> {
  const lastPage = Math.max(1, Math.ceil(stars / 100));
  const times: number[] = [];
  let calls = 0;
  let reachedStart = false;
  const horizon = now - GH_PERIOD_DAYS.monthly * 86_400_000;
  for (let page = lastPage; page >= 1 && calls < maxPages; page--) {
    const rows = await ghJson<{ starred_at: string }[]>(
      `https://api.github.com/repos/${fullName}/stargazers?per_page=100&page=${page}`,
      "application/vnd.github.star+json",
    );
    calls++;
    for (const r of rows) times.push(Date.parse(r.starred_at));
    if (page === 1) reachedStart = true;
    if (rows.length > 0 && Date.parse(rows[0].starred_at) < horizon) break;
  }
  const oldest = times.length ? Math.min(...times) : now;
  const gained: Partial<Record<GhPeriod, number>> = {};
  for (const p of GH_PERIODS) {
    const from = now - GH_PERIOD_DAYS[p] * 86_400_000;
    if (reachedStart || oldest < from) gained[p] = times.filter((t) => t >= from).length;
  }
  return { gained, calls };
}

export const hasToken = () => TOKEN !== "";
