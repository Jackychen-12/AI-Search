import fs from "node:fs";
import { DATA_DIR, META_PATH, STORE_PATH } from "../../lib/config";
import type { AIItem } from "../../lib/types";

function dedupeKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Normalized title for cross-source same-story dedupe (strip spaces + punctuation). */
function titleKey(t: string): string {
  return t.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

/** Tokens for near-duplicate detection: latin words (≥3 chars) + CJK bigrams per run. */
function titleTokens(t: string): Set<string> {
  const lower = t.toLowerCase();
  const tokens = new Set<string>();
  for (const m of lower.matchAll(/[a-z0-9][a-z0-9.-]{2,}/g)) tokens.add(m[0]);
  // Bigrams within each contiguous CJK run — never across a latin word.
  for (const run of lower.match(/[\u2e80-\u9fff]+/g) ?? []) {
    if (run.length === 1) tokens.add(run);
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2));
  }
  return tokens;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

const NEAR_DUP_JACCARD = 0.65;
const NEAR_DUP_WINDOW_MS = 72 * 3600_000;

/** Latin tokens carry the product/model names — they must agree before merging. */
function latinAgree(a: Set<string>, b: Set<string>): boolean {
  const la = [...a].filter((t) => /^[a-z0-9]/.test(t));
  const lb = [...b].filter((t) => /^[a-z0-9]/.test(t));
  if (la.length === 0 && lb.length === 0) return true; // pure CJK both sides
  if (la.length === 0 || lb.length === 0) return false;
  const bs = new Set(lb);
  const inter = la.filter((t) => bs.has(t)).length;
  return inter / Math.min(la.length, lb.length) >= 0.5;
}

/**
 * Collapse near-duplicate stories across sources: same-language rewrites of
 * one event ("OpenAI 发布 GPT-5" vs "GPT-5 正式上线：OpenAI …") published
 * within 72h of each other. Conservative on purpose — a false merge hides a
 * real story, a missed merge only shows a duplicate. Latin tokens (product /
 * model names) must agree so "苹果发布 MacBook" never merges with
 * "苹果发布 iPhone".
 */
export function collapseNearDuplicates(items: AIItem[]): AIItem[] {
  const kept: { it: AIItem; tokens: Set<string>; time: number }[] = [];
  const drop = new Set<string>();
  for (const it of items) {
    const tokens = titleTokens(it.title);
    const time = Date.parse(it.publishedAt ?? it.firstSeen ?? "") || 0;
    let merged = false;
    for (const k of kept) {
      if (tokens.size < 4 || k.tokens.size < 4) continue; // too short to judge
      if (time && k.time && Math.abs(time - k.time) > NEAR_DUP_WINDOW_MS) continue;
      if (jaccard(tokens, k.tokens) < NEAR_DUP_JACCARD) continue;
      if (!latinAgree(tokens, k.tokens)) continue;
      // Same story — keep the richer entry.
      if (score(it) > score(k.it)) {
        drop.add(k.it.id);
        k.it = it;
        k.tokens = tokens;
        k.time = time;
      } else {
        drop.add(it.id);
      }
      merged = true;
      break;
    }
    if (!merged) kept.push({ it, tokens, time });
  }
  return items.filter((it) => !drop.has(it.id));
}

/** Higher = keep. Prefer items with a summary, then selected, then more engaged. */
function score(it: AIItem): number {
  return (it.summary ? 2 : 0) + (it.aiSelected ? 0.5 : 0) + (it.engagement ?? it.heat ?? 0) * 1e-6;
}

/**
 * Dedupe by URL, then collapse near-duplicate titles across sources (keeping the
 * richer entry), then sort newest-first.
 */
export function dedupeAndSort(items: AIItem[]): AIItem[] {
  const byUrl = new Map<string, AIItem>();
  for (const it of items) {
    if (!it.sourceUrl) continue;
    const k = dedupeKey(it.sourceUrl);
    const prev = byUrl.get(k);
    if (!prev || score(it) > score(prev)) byUrl.set(k, it);
  }

  const byTitle = new Map<string, AIItem>();
  for (const it of byUrl.values()) {
    const tk = titleKey(it.title);
    const key = tk.length >= 8 ? `t:${tk}` : `id:${it.id}`; // short titles: don't merge
    const prev = byTitle.get(key);
    if (!prev || score(it) > score(prev)) byTitle.set(key, it);
  }

  const deduped = [...byTitle.values()];
  return collapseNearDuplicates(deduped).sort((a, b) => {
    const da = a.publishedAt ?? a.firstSeen ?? "";
    const db = b.publishedAt ?? b.firstSeen ?? "";
    return db.localeCompare(da);
  });
}

export interface PrevInfo {
  firstSeen?: string | null;
  aiNote?: string | null;
}

/** id -> { firstSeen, aiNote } from the previous snapshot (for diff + caching). */
export function loadPrevious(): Map<string, PrevInfo> {
  const map = new Map<string, PrevInfo>();
  try {
    const prev = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as AIItem[];
    if (Array.isArray(prev)) {
      for (const it of prev) {
        if (it.id) map.set(it.id, { firstSeen: it.firstSeen ?? null, aiNote: it.aiNote ?? null });
      }
    }
  } catch {
    // no previous snapshot — everything is new.
  }
  return map;
}

/**
 * Stamp firstSeen = the time WE first collected the item (carried forward from the
 * previous snapshot; otherwise now). This is collection time, not publish time —
 * it's what drives NEW / 今日新收录 / the daily digest.
 */
export function applyHistory(items: AIItem[], prev: Map<string, PrevInfo>, nowIso: string): AIItem[] {
  return items.map((it) => {
    const p = prev.get(it.id);
    return {
      ...it,
      firstSeen: it.firstSeen ?? p?.firstSeen ?? nowIso,
      aiNote: it.aiNote ?? p?.aiNote ?? null,
    };
  });
}

export interface SnapshotResult {
  count: number;
  path: string;
}

/** Stamp fetchedAt, write items.json + meta.json. */
export function writeSnapshot(
  items: AIItem[],
  sources: Record<string, number>,
  errors: Record<string, string> = {},
): SnapshotResult {
  const fetchedAt = new Date().toISOString();
  const stamped = items.map((it) => ({ ...it, fetchedAt: it.fetchedAt ?? fetchedAt }));

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(stamped, null, 2) + "\n", "utf8");
  fs.writeFileSync(
    META_PATH,
    JSON.stringify({ fetchedAt, count: stamped.length, sources, errors }, null, 2) + "\n",
    "utf8",
  );
  return { count: stamped.length, path: STORE_PATH };
}
