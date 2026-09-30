import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./config";
import type { GhRepo, GhTrendingSnapshot } from "./ghTrending";
import type { AIItem } from "./types";

/** Written by `npm run crawl:github` (also runs at the end of `npm run crawl`). */
export const GH_TRENDING_PATH = path.join(DATA_DIR, "github-trending.json");

export function readGhTrending(): GhTrendingSnapshot | null {
  try {
    const d = JSON.parse(fs.readFileSync(GH_TRENDING_PATH, "utf8")) as GhTrendingSnapshot;
    return d && Array.isArray(d.repos) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Tag feed items that are about a trending repo — either they link straight to
 * it (Show HN, GitHub-sourced items) or the crawler matched them as its news.
 */
export function attachGhTrend(items: AIItem[], snap: GhTrendingSnapshot | null): AIItem[] {
  if (!snap) return items;
  const byUrl = new Map<string, GhRepo>();
  const byNewsId = new Map<string, GhRepo>();
  for (const r of snap.repos) {
    byUrl.set(r.url.toLowerCase(), r);
    for (const n of r.news) if (!byNewsId.has(n.id)) byNewsId.set(n.id, r);
  }
  return items.map((it) => {
    const url = it.sourceUrl.toLowerCase().replace(/[#?].*$/, "").replace(/\/+$/, "");
    const r = byUrl.get(url) ?? byNewsId.get(it.id);
    if (!r) return it;
    const period = r.gained.weekly !== undefined ? "weekly" : r.gained.daily !== undefined ? "daily" : "monthly";
    const gained = r.gained[period];
    return gained ? { ...it, ghTrend: { repo: r.fullName, gained, period } } : it;
  });
}
