import type { AIItem } from "../../lib/types";

/**
 * Unified 0-100 heat score, replacing the old "raw engagement × tier weight"
 * scheme where GitHub stars (thousands) crushed official-lab posts (heat 0)
 * and 64% of items tied at zero.
 *
 *   heat = (tier base + engagement bonus) × freshness decay
 *
 * - tier base   — source credibility floor: first-party > media > aggregator,
 *                 so an OpenAI post never ranks below a random repo by default.
 * - engagement  — log-scaled percentile *within the item's own origin*, so
 *                 stars / HN points / HF upvotes are comparable. Centered on
 *                 the origin's median: top engagement earns up to +15, weak
 *                 engagement costs up to -15, no engagement data is neutral —
 *                 this stops engagement-bearing sources (papers/repos) from
 *                 blanket-outranking every first-party post.
 * - freshness   — exponential decay on publish age (half impact ~1 week),
 *                 floored so archives keep a meaningful relative order.
 *
 * The raw engagement count is preserved separately on `item.engagement` for
 * display (★ 1,234 / HN 356 赞).
 */

const TIER_BASE: Record<number, number> = { 1: 55, 2: 40, 3: 25 };
const ENGAGEMENT_SPAN = 30; // centered: percentile 1.0 → +15, percentile 0 → -15
const FRESH_HALF_LIFE_DAYS = 7;
const FRESH_FLOOR = 0.55;
const MAX_AGE_DAYS = 60;

function ageDays(item: AIItem, nowMs: number): number {
  const t = Date.parse(item.publishedAt ?? item.firstSeen ?? "");
  if (!Number.isFinite(t)) return MAX_AGE_DAYS;
  const d = (nowMs - t) / 86_400_000;
  return Math.min(Math.max(d, 0), MAX_AGE_DAYS);
}

function freshness(item: AIItem, nowMs: number): number {
  const decay = Math.exp((-ageDays(item, nowMs) * Math.LN2) / FRESH_HALF_LIFE_DAYS);
  return FRESH_FLOOR + (1 - FRESH_FLOOR) * decay;
}

/**
 * Percentile (0..1) of log-scaled engagement within each origin group.
 * Origins where nothing has engagement (plain RSS feeds) contribute 0 —
 * their items rank purely on tier + freshness.
 */
function engagementPercentiles(items: AIItem[]): Map<string, number> {
  const byOrigin = new Map<string, AIItem[]>();
  for (const it of items) {
    const key = it.origin ?? it.source;
    if (!byOrigin.has(key)) byOrigin.set(key, []);
    byOrigin.get(key)!.push(it);
  }

  const pct = new Map<string, number>();
  for (const group of byOrigin.values()) {
    const engaged = group.filter((it) => (it.engagement ?? 0) > 0);
    if (engaged.length === 0) continue;
    const logs = engaged.map((it) => Math.log1p(it.engagement ?? 0)).sort((a, b) => a - b);
    for (const it of engaged) {
      const v = Math.log1p(it.engagement ?? 0);
      // rank of v among the group's log values (midpoint of equal range).
      let lo = 0;
      let hi = 0;
      for (const l of logs) {
        if (l < v) lo++;
        if (l <= v) hi++;
      }
      pct.set(it.id, logs.length === 1 ? 1 : (lo + hi) / 2 / logs.length);
    }
  }
  return pct;
}

/** Compute the final `heat` for a merged item set. `tiers` maps origin -> tier. */
export function computeHeat(
  items: AIItem[],
  tiers: Record<string, number>,
  nowMs = Date.now(),
): AIItem[] {
  const pct = engagementPercentiles(items);
  return items.map((it) => {
    const tier = (tiers[it.origin ?? ""] ?? 3) as 1 | 2 | 3;
    const base = TIER_BASE[tier] ?? TIER_BASE[3];
    const p = pct.get(it.id);
    const bonus = p == null ? 0 : (p - 0.5) * ENGAGEMENT_SPAN;
    const heat = Math.round((base + bonus) * freshness(it, nowMs));
    // Stamp the tier too — the UI shows a first-party badge off it.
    return { ...it, tier, heat: Math.max(1, Math.min(heat, 100)) };
  });
}
