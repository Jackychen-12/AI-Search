import type { AIItem } from "./types";
import { entitiesOf } from "./entities";

/**
 * Storyline engine — clusters items that report the same real-world event
 * across different sources into a "story", entirely at build time (no LLM,
 * no server). Deterministic: same input -> same story ids.
 *
 * Linking rule (both must hold):
 *   1. Title token overlap: >= MIN_SHARED shared tokens AND Jaccard >= MIN_JACCARD.
 *      Tokens = ASCII words (stopword-filtered) + CJK bigrams.
 *   2. Published within LINK_WINDOW_MS of each other (chains via union-find
 *      let a story span longer than one window).
 * Veto: if both items have known entities and the sets are disjoint, never
 * link (prevents "OpenAI 发布新模型" merging with "Anthropic 发布新模型").
 *
 * A cluster becomes a story only with >= 2 items from >= 2 distinct sources —
 * cross-source corroboration is the whole point.
 */

export interface StoryItem {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  time: string; // publishedAt ?? firstSeen ?? fetchedAt
  heat: number;
  aiNote?: string | null;
}

export type StoryStatus = "new" | "developing" | "settled";

export interface Story {
  id: string; // id of the earliest item — stable across rebuilds
  title: string; // representative title (highest heat, then newest)
  entities: string[];
  sources: string[]; // distinct, in first-appearance order
  sourceCount: number;
  firstPartyCount: number; // sources that are the subject's own channel
  status: StoryStatus;
  firstSeen: string;
  lastUpdate: string;
  spanDays: number; // distinct calendar days with coverage
  heat: number; // max item heat
  aiNote: string | null; // note of the representative item
  items: StoryItem[]; // ascending by time
}

const LINK_WINDOW_MS = 72 * 3600 * 1000;
const POOL_DAYS = 14;
const MIN_SHARED = 2;
const MIN_JACCARD = 0.3;
const ACTIVE_WINDOW_MS = 36 * 3600 * 1000; // last update within -> story still active
// Tokens appearing in more than this many pool items are too generic to pair on.
const MAX_TOKEN_DF = 50;

const ASCII_STOP = new Set([
  "the", "a", "an", "of", "to", "in", "for", "and", "or", "on", "with", "is",
  "are", "was", "at", "by", "as", "its", "it", "be", "from", "how", "why",
  "what", "when", "your", "you", "we", "our", "this", "that", "new", "now",
  "ai", "llm", "llms", "vs", "via", "into", "not", "no", "up", "out", "about",
  "more", "can", "will", "just", "hn", "show",
]);

// First-party channels (the subject's own blog/announcement feed).
const FIRST_PARTY = new Set([
  "OpenAI", "Anthropic", "Google AI", "Google DeepMind", "Meta AI", "NVIDIA",
  "HuggingFace Blog", "Mistral AI", "Cohere", "Stability AI",
  "Berkeley AI Research", "MIT News", "Microsoft Research", "AWS ML",
]);

/** Title -> comparable token set: ASCII words + CJK bigrams. */
export function tokensOf(title: string): Set<string> {
  const t = title.toLowerCase();
  const out = new Set<string>();
  for (const m of t.matchAll(/[a-z0-9][a-z0-9.\-]*/g)) {
    const w = m[0].replace(/^[.\-]+|[.\-]+$/g, "");
    if (w.length >= 2 && !ASCII_STOP.has(w)) out.add(w);
  }
  const runs = t.match(/[\u4e00-\u9fff]+/g) ?? [];
  for (const run of runs) {
    if (run.length === 1) out.add(run);
    for (let i = 0; i < run.length - 1; i++) out.add(run.slice(i, i + 2));
  }
  return out;
}

function itemTime(it: AIItem): string | null {
  return it.publishedAt ?? it.firstSeen ?? it.fetchedAt ?? null;
}

interface Node {
  item: AIItem;
  time: number;
  iso: string;
  tokens: Set<string>;
  entities: string[];
}

/** true when the two nodes report the same event (see module doc). */
export function sameEvent(a: { tokens: Set<string>; entities: string[] }, b: { tokens: Set<string>; entities: string[] }): boolean {
  let shared = 0;
  const [small, big] = a.tokens.size <= b.tokens.size ? [a.tokens, b.tokens] : [b.tokens, a.tokens];
  for (const tok of small) if (big.has(tok)) shared++;
  if (shared < MIN_SHARED) return false;
  const union = a.tokens.size + b.tokens.size - shared;
  if (union === 0 || shared / union < MIN_JACCARD) return false;
  if (a.entities.length > 0 && b.entities.length > 0) {
    const set = new Set(a.entities);
    if (!b.entities.some((e) => set.has(e))) return false;
  }
  return true;
}

class UnionFind {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

/** Poster filename for a story id (chars sanitized for filesystem/URL use). */
export function storyPosterName(id: string): string {
  return `story-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
}

/** Cluster recent items into cross-source stories. `now` defaults to the pool's newest time. */
export function buildStories(pool: AIItem[], now?: number): Story[] {
  // Deduplicate by id (current snapshot + archive overlap) and keep recent items only.
  const seen = new Set<string>();
  const nodes: Node[] = [];
  let newest = 0;
  for (const it of pool) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    const iso = itemTime(it);
    if (!iso) continue;
    const time = new Date(iso).getTime();
    if (Number.isNaN(time)) continue;
    if (time > newest) newest = time;
    nodes.push({ item: it, time, iso, tokens: tokensOf(it.title), entities: entitiesOf(it) });
  }
  const ref = now ?? newest;
  const cutoff = ref - POOL_DAYS * 86400000;
  const recent = nodes.filter((n) => n.time >= cutoff && n.time <= ref + 86400000);

  // Candidate pairs via an inverted token index (skip hyper-common tokens).
  const byToken = new Map<string, number[]>();
  recent.forEach((n, i) => {
    for (const tok of n.tokens) {
      const arr = byToken.get(tok);
      if (arr) arr.push(i);
      else byToken.set(tok, [i]);
    }
  });

  const uf = new UnionFind(recent.length);
  const checked = new Set<number>(); // pair key: i * len + j
  for (const idxs of byToken.values()) {
    if (idxs.length < 2 || idxs.length > MAX_TOKEN_DF) continue;
    for (let x = 0; x < idxs.length; x++) {
      for (let y = x + 1; y < idxs.length; y++) {
        const i = idxs[x];
        const j = idxs[y];
        const key = i * recent.length + j;
        if (checked.has(key)) continue;
        checked.add(key);
        const a = recent[i];
        const b = recent[j];
        if (Math.abs(a.time - b.time) > LINK_WINDOW_MS) continue;
        if (a.item.source === b.item.source && uf.find(i) === uf.find(j)) continue;
        if (sameEvent(a, b)) uf.union(i, j);
      }
    }
  }

  // Collect clusters.
  const groups = new Map<number, Node[]>();
  recent.forEach((n, i) => {
    const root = uf.find(i);
    const g = groups.get(root);
    if (g) g.push(n);
    else groups.set(root, [n]);
  });

  const stories: Story[] = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const sources = [...new Set(g.map((n) => n.item.source))];
    if (sources.length < 2) continue; // cross-source corroboration required

    g.sort((a, b) => a.time - b.time);
    const rep = [...g].sort(
      (a, b) => (b.item.heat ?? 0) - (a.item.heat ?? 0) || b.time - a.time,
    )[0];
    const first = g[0];
    const last = g[g.length - 1];
    const days = new Set(g.map((n) => n.iso.slice(0, 10)));
    const active = ref - last.time <= ACTIVE_WINDOW_MS;
    const status: StoryStatus = !active ? "settled" : days.size >= 2 ? "developing" : "new";
    const ents = [...new Set(g.flatMap((n) => n.entities))];

    stories.push({
      id: first.item.id,
      title: rep.item.title,
      entities: ents,
      sources,
      sourceCount: sources.length,
      firstPartyCount: sources.filter((s) => FIRST_PARTY.has(s)).length,
      status,
      firstSeen: first.iso,
      lastUpdate: last.iso,
      spanDays: days.size,
      heat: Math.max(...g.map((n) => n.item.heat ?? 0)),
      aiNote: rep.item.aiNote ?? null,
      items: g.map((n) => ({
        id: n.item.id,
        title: n.item.title,
        source: n.item.source,
        sourceUrl: n.item.sourceUrl,
        time: n.iso,
        heat: n.item.heat ?? 0,
        aiNote: n.item.aiNote ?? null,
      })),
    });
  }

  const STATUS_ORDER: Record<StoryStatus, number> = { developing: 0, new: 1, settled: 2 };
  stories.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.sourceCount - a.sourceCount ||
      b.lastUpdate.localeCompare(a.lastUpdate),
  );
  return stories;
}
