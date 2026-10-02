/**
 * GitHub AI 趋势 crawler.
 *
 * Run with:  npm run crawl:github   (also runs at the end of `npm run crawl`)
 *
 * Builds the repo pool from three sources:
 *   trending — github.com/trending (today / week / month × language slices):
 *              GitHub's own star velocity, the backbone of the page
 *   paper    — HuggingFace trending / daily papers that link a GitHub repo
 *   discover — new repos (≤ 30 days) in world-model / embodied topics
 * then enriches, classifies, attaches related site news, carries history /
 * first-seen / AI notes over, and writes data/github-trending.json.
 */
import fs from "node:fs";
import path from "node:path";
import {
  GH_PERIODS,
  GH_PERIOD_DAYS,
  type GhPaper,
  type GhPeriod,
  type GhRepo,
  type GhSource,
  type GhTrendingSnapshot,
} from "../lib/ghTrending";
import { GH_TRENDING_PATH, readGhTrending } from "../lib/ghTrendingStore";
import { readArchive } from "../lib/archive";
import { readLocalItems } from "../lib/localStore";
import { getJson, getText } from "./lib/fetchUtil";
import { discoverRepos, hasToken, lookupRepos, starGains, type ApiRepo } from "./lib/ghApi";
import { matchNews } from "./lib/ghNews";
import { NOTE_SYSTEM, TAG_SYSTEM, cleanNote, parseTags } from "./lib/ghNote";
import { bjDate } from "./lib/time";
import { TRENDING_LANGS, classifyRepo, funKind, parseTrendingHtml, trendingUrl, type TrendingRow } from "./sources/githubTrending";

/** Star-history samples kept per repo (one per Beijing day). */
const HISTORY_DAYS = 60;
const NOTE_MAX = Number(process.env.GH_NOTE_MAX || 40);
/** Keyword generation: repos per LLM call, and calls per run (30 × 8 covers the whole list in one go). */
const TAG_BATCH = 8;
const TAG_CALLS = Number(process.env.GH_TAG_CALLS || 30);
/** Non-trending repos below this are noise. */
const MIN_STARS = 50;
/** Papers older than this aren't "trending research" any more. */
const PAPER_MAX_AGE_DAYS = 90;
/**
 * Core-API calls for stargazer counting. The stargazers endpoint answers 401
 * without a token, so unauthenticated local runs skip it (CI has GITHUB_TOKEN).
 */
const STAR_BUDGET = Number(process.env.GH_STAR_BUDGET || (hasToken() ? 600 : 0));
const STAR_PAGES = hasToken() ? 10 : 2;

const DISCOVER_QUERIES = [
  // 世界模型 · 具身
  "topic:world-model",
  "topic:world-models",
  '"world model" in:name,description',
  "topic:embodied-ai",
  "topic:vla",
  "topic:robot-learning",
  // 有趣 AI 玩法
  "topic:ai-companion",
  "topic:desktop-pet",
  "topic:voice-cloning",
  "topic:music-generation",
  "topic:ai-art",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errMsg = (e: unknown) => String(e instanceof Error ? e.message : e).slice(0, 100);

interface Cand {
  fullName: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  gained: Partial<Record<GhPeriod, number>>;
  sources: Set<GhSource>;
  paper: GhPaper | null;
  createdAt: string | null;
  topics: string[];
}

// --- source 1: GitHub Trending ----------------------------------------------

async function scanTrending(failed: string[]): Promise<Map<string, TrendingRow & { gainedBy: Partial<Record<GhPeriod, number>> }>> {
  const byName = new Map<string, TrendingRow & { gainedBy: Partial<Record<GhPeriod, number>> }>();
  // Sequential + small gap: ~27 HTML pages, be a polite scraper.
  for (const period of GH_PERIODS) {
    for (const lang of TRENDING_LANGS) {
      try {
        for (const r of parseTrendingHtml(await getText(trendingUrl(period, lang)))) {
          const prev = byName.get(r.fullName);
          const gainedBy = { ...(prev?.gainedBy ?? {}), [period]: Math.max(prev?.gainedBy[period] ?? 0, r.gained) };
          byName.set(r.fullName, {
            ...(prev ?? r),
            stars: Math.max(prev?.stars ?? 0, r.stars),
            forks: Math.max(prev?.forks ?? 0, r.forks),
            gainedBy,
          });
        }
      } catch (e) {
        failed.push(`trending ${period}/${lang || "all"}: ${errMsg(e)}`);
      }
      await sleep(400);
    }
  }
  return byName;
}

// --- source 2: HuggingFace papers with code ---------------------------------

interface HFRow {
  title?: string;
  paper?: { id?: string; title?: string; publishedAt?: string; upvotes?: number; githubRepo?: string; githubStars?: number };
}

async function fetchPaperRepos(failed: string[]): Promise<Map<string, { fullName: string; paper: GhPaper }>> {
  const out = new Map<string, { fullName: string; paper: GhPaper }>();
  const cutoff = Date.now() - PAPER_MAX_AGE_DAYS * 86_400_000;
  for (const url of [
    "https://huggingface.co/api/daily_papers?sort=trending&limit=100",
    "https://huggingface.co/api/daily_papers?limit=100",
  ]) {
    try {
      for (const row of await getJson<HFRow[]>(url)) {
        const p = row.paper;
        const m = p?.githubRepo?.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
        if (!p?.id || !m || (p.githubStars ?? 0) < MIN_STARS) continue;
        if (p.publishedAt && Date.parse(p.publishedAt) < cutoff) continue;
        const fullName = `${m[1]}/${m[2].replace(/\.git$/, "")}`;
        const key = fullName.toLowerCase();
        if (out.has(key)) continue;
        out.set(key, {
          fullName,
          paper: {
            title: (row.title || p.title || "").trim(),
            url: `https://huggingface.co/papers/${p.id}`,
            publishedAt: p.publishedAt ?? null,
            upvotes: p.upvotes ?? 0,
          },
        });
      }
    } catch (e) {
      failed.push(`hf-papers: ${errMsg(e)}`);
    }
  }
  return out;
}

// --- one-line Chinese take (DeepSeek, optional, cached across runs) ----------

const LLM_KEY = process.env.DEEPSEEK_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";
const SYSTEM = NOTE_SYSTEM;

async function noteFor(r: GhRepo): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LLM_KEY}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.5,
        max_tokens: 120,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content:
              `仓库：${r.fullName}\n简介：${r.description ?? "（无）"}\n语言：${r.language ?? "未知"}` +
              (r.paper ? `\n对应论文：${r.paper.title}` : ""),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return cleanNote(data.choices?.[0]?.message?.content, true);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function addNotes(repos: GhRepo[]): Promise<void> {
  if (!LLM_KEY) {
    console.log("[gh-trending] no DEEPSEEK_API_KEY — skipping AI notes.");
    return;
  }
  const targets = repos.filter((r) => !r.aiNote && (r.description || r.paper)).slice(0, NOTE_MAX);
  const queue = [...targets];
  let ok = 0;
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      const n = await noteFor(r);
      if (n) {
        r.aiNote = n;
        ok++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, targets.length) }, worker));
  console.log(`[gh-trending] AI notes: ${ok}/${targets.length}`);
}

/** Chinese search keywords for repos that don't have them yet (batched; cached in the snapshot). */
async function addTags(repos: GhRepo[]): Promise<void> {
  if (!LLM_KEY) return;
  const targets = repos.filter((r) => !r.tags?.length && (r.description || r.aiNote || r.paper));
  const batches: GhRepo[][] = [];
  for (let i = 0; i < targets.length && batches.length < TAG_CALLS; i += TAG_BATCH) batches.push(targets.slice(i, i + TAG_BATCH));
  let ok = 0;
  const worker = async () => {
    for (let batch = batches.shift(); batch; batch = batches.shift()) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 40000);
      try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LLM_KEY}`, "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            model: LLM_MODEL,
            temperature: 0.2,
            max_tokens: 900,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: TAG_SYSTEM },
              {
                role: "user",
                content: batch
                  .map((r) => `仓库：${r.fullName}\n简介：${r.description ?? "（无）"}\n解读：${r.aiNote ?? r.paper?.title ?? "（无）"}`)
                  .join("\n\n"),
              },
            ],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const tags = parseTags(data.choices?.[0]?.message?.content, batch.map((r) => r.fullName));
        for (const r of batch) {
          const t = tags.get(r.fullName);
          if (t) {
            r.tags = t;
            ok++;
          }
        }
      } catch {
        // one failed batch never blocks the crawl — those repos are retried next run
      } finally {
        clearTimeout(timer);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, batches.length) }, worker));
  console.log(`[gh-trending] search keywords: ${ok}/${targets.length}`);
}

// ---------------------------------------------------------------------------

/** Rebuild a candidate from yesterday's snapshot (used when its source is down today). */
function candFromPrev(r: GhRepo, src: GhSource): Cand {
  return {
    fullName: r.fullName,
    description: r.description,
    language: r.language,
    languageColor: r.languageColor,
    stars: r.stars,
    forks: r.forks,
    gained: {},
    sources: new Set([src]),
    paper: r.paper ?? null,
    createdAt: r.createdAt ?? null,
    topics: r.topics ?? [],
  };
}

/** Stars gained since the history sample closest to `days` ago (±1 day), if any. */
function gainFromHistory(history: { date: string; stars: number }[], stars: number, days: number, today: string): number | undefined {
  const target = Date.parse(today) - days * 86_400_000;
  const s = history.find((h) => Math.abs(Date.parse(h.date) - target) <= 86_400_000);
  return s ? Math.max(0, stars - s.stars) : undefined;
}

export async function runGithubTrending(): Promise<{ written: number; counts: GhTrendingSnapshot["counts"]; failed: string[] }> {
  const failed: string[] = [];
  const prevSnap = readGhTrending();
  const prev = new Map((prevSnap?.repos ?? []).map((r) => [r.fullName.toLowerCase(), r]));
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const today = bjDate();

  // 1. Trending — pre-filter to AI by name/description (topics come later).
  const trending = await scanTrending(failed);
  if (trending.size === 0) throw new Error(`all trending pages failed: ${failed[0] ?? "unknown"}`);
  // GitHub changing its markup shows up as rows without star counts — refuse to
  // write that (the previous snapshot stays in place and CI flags the source).
  const noStars = [...trending.values()].filter((r) => r.stars === 0).length;
  if (trending.size >= 20 && noStars > trending.size / 2) {
    throw new Error(`trending markup changed? ${noStars}/${trending.size} rows parsed without star counts`);
  }
  const langColors = new Map<string, string>();
  const cands = new Map<string, Cand>();
  for (const r of trending.values()) {
    if (r.language && r.languageColor) langColors.set(r.language, r.languageColor);
    if (!classifyRepo({ fullName: r.fullName, description: r.description }).ai) continue;
    const old = prev.get(r.fullName.toLowerCase());
    cands.set(r.fullName.toLowerCase(), {
      fullName: r.fullName,
      description: r.description,
      language: r.language,
      languageColor: r.languageColor,
      stars: r.stars,
      forks: r.forks,
      gained: r.gainedBy,
      sources: new Set(["trending"]),
      paper: null,
      createdAt: old?.createdAt ?? null,
      topics: old?.topics ?? [],
    });
  }

  // 2. Papers with code.
  const papers = await fetchPaperRepos(failed);
  for (const [key, p] of papers) {
    const c = cands.get(key);
    if (c) {
      c.sources.add("paper");
      c.paper = p.paper;
      continue;
    }
    const old = prev.get(key);
    cands.set(key, {
      fullName: p.fullName,
      description: old?.description ?? null,
      language: old?.language ?? null,
      languageColor: old?.languageColor ?? null,
      stars: old?.stars ?? 0,
      forks: old?.forks ?? 0,
      gained: {},
      sources: new Set(["paper"]),
      paper: p.paper,
      createdAt: old?.createdAt ?? null,
      topics: old?.topics ?? [],
    });
  }

  // 3. Discovery — new world-model / embodied repos (already carry full metadata).
  const fromApi = new Map<string, ApiRepo>();
  let discovered = 0;
  for (const q of DISCOVER_QUERIES) {
    try {
      for (const r of await discoverRepos(q, GH_PERIOD_DAYS.monthly, MIN_STARS, 15)) {
        const key = r.full_name.toLowerCase();
        fromApi.set(key, r);
        const c = cands.get(key);
        if (c) c.sources.add("discover");
        else {
          discovered++;
          cands.set(key, {
            fullName: r.full_name,
            description: r.description,
            language: r.language,
            languageColor: null,
            stars: r.stargazers_count,
            forks: r.forks_count,
            gained: {},
            sources: new Set(["discover"]),
            paper: null,
            createdAt: r.created_at,
            topics: r.topics ?? [],
          });
        }
      }
    } catch (e) {
      failed.push(`discover "${q}": ${errMsg(e)}`);
    }
  }

  // A source that failed outright today keeps yesterday's repos rather than vanishing.
  const carry = (src: GhSource, failedToday: boolean) => {
    if (!failedToday) return;
    let n = 0;
    for (const [key, r] of prev) {
      if (!r.sources?.includes(src) || cands.has(key)) continue;
      cands.set(key, candFromPrev(r, src));
      n++;
    }
    if (n) console.log(`[gh-trending] ${src} unavailable — carried over ${n} repo(s) from the last snapshot`);
  };
  carry("paper", papers.size === 0);
  carry("discover", fromApi.size === 0);

  // 4. Enrich: createdAt + topics for trending repos (cached across runs), and
  //    canonical name / stars / description for every paper repo (they change).
  const need = [...cands.entries()]
    .filter(([key, c]) => !fromApi.has(key) && (c.sources.has("paper") || !c.createdAt))
    .map(([, c]) => c.fullName);
  const looked = await lookupRepos(need);
  for (const [key, r] of [...looked, ...fromApi]) {
    const c = cands.get(key);
    if (!c) continue;
    c.fullName = r.full_name;
    c.createdAt = r.created_at;
    c.topics = r.topics ?? [];
    if (!c.sources.has("trending")) {
      c.description = r.description;
      c.language = r.language;
      c.stars = r.stargazers_count;
      c.forks = r.forks_count;
    }
  }
  for (const c of cands.values()) if (c.language && !c.languageColor) c.languageColor = langColors.get(c.language) ?? null;

  // 5. Classify (now with topics + paper), 6. star gains for non-trending repos.
  let starCalls = 0;
  const repos: GhRepo[] = [];
  const pool = [...cands.values()].sort((a, b) => b.stars - a.stars);
  for (const c of pool) {
    const cls = classifyRepo({ fullName: c.fullName, description: c.description, topics: c.topics, hasPaper: !!c.paper });
    if (!cls.ai) continue;
    const old = prev.get(c.fullName.toLowerCase());
    const history = (old?.history ?? []).filter((h) => h.date !== today);

    if (!c.sources.has("trending")) {
      if (c.stars < MIN_STARS) continue;
      const age = c.createdAt ? (now - Date.parse(c.createdAt)) / 86_400_000 : Infinity;
      for (const p of GH_PERIODS) {
        if (age <= GH_PERIOD_DAYS[p]) c.gained[p] = c.stars; // born inside the window: every star is new
      }
      const missing = GH_PERIODS.filter((p) => c.gained[p] === undefined);
      if (missing.length && starCalls < STAR_BUDGET) {
        try {
          const g = await starGains(c.fullName, c.stars, Math.min(STAR_PAGES, STAR_BUDGET - starCalls), now);
          starCalls += g.calls;
          for (const p of missing) if (g.gained[p] !== undefined) c.gained[p] = g.gained[p];
        } catch (e) {
          failed.push(`stargazers ${c.fullName}: ${errMsg(e)}`);
          if (/HTTP (401|403|429)/.test(errMsg(e))) starCalls = STAR_BUDGET; // auth / rate limit — stop spending
        }
      }
      for (const p of GH_PERIODS) {
        if (c.gained[p] === undefined) c.gained[p] = gainFromHistory(history, c.stars, GH_PERIOD_DAYS[p], today);
        if (c.gained[p] === undefined) delete c.gained[p];
      }
      if (!GH_PERIODS.some((p) => (c.gained[p] ?? 0) > 0)) continue; // can't rank it — skip
    }

    history.push({ date: today, stars: c.stars });
    repos.push({
      fullName: c.fullName,
      url: `https://github.com/${c.fullName}`,
      description: c.description,
      language: c.language,
      languageColor: c.languageColor,
      stars: c.stars,
      forks: c.forks,
      gained: c.gained,
      track: cls.track,
      signals: cls.signals,
      sources: [...c.sources],
      createdAt: c.createdAt,
      topics: c.topics.slice(0, 8),
      paper: c.paper,
      news: [],
      firstSeen: old?.firstSeen ?? nowIso,
      history: history.slice(-HISTORY_DAYS),
      // Description changed → the old take may be stale; cleanNote also drops notes cut off mid-sentence.
      aiNote: old && old.description === c.description ? cleanNote(old.aiNote) : null,
      fun: funKind({ fullName: c.fullName, description: c.description, topics: c.topics, track: cls.track }),
      // Keywords describe the repo itself — reuse them until its description changes.
      tags: old && old.description === c.description ? old.tags : undefined,
    });
  }
  console.log(`[gh-trending] stargazer calls: ${starCalls}/${STAR_BUDGET}`);

  // 7. "为什么火" — related news from the site's own snapshot + archive.
  const byId = new Map([...readArchive(), ...readLocalItems()].map((i) => [i.id, i]));
  const news = matchNews(repos, [...byId.values()], now);
  for (const r of repos) r.news = news.get(r.fullName.toLowerCase()) ?? [];

  // Hottest first — the AI-note budget goes to the top.
  const score = (r: GhRepo) => (r.gained.weekly ?? 0) + (r.gained.daily ?? 0) * 3 + (r.gained.monthly ?? 0) / 4;
  repos.sort((a, b) => score(b) - score(a));
  await addNotes(repos);
  await addTags(repos); // after the notes: they are part of the prompt

  const counts = {
    trending: trending.size,
    paper: repos.filter((r) => r.sources.includes("paper")).length,
    discover: discovered,
  };
  const snap: GhTrendingSnapshot = { fetchedAt: nowIso, startedAt: prevSnap?.startedAt ?? nowIso, counts, repos };
  fs.mkdirSync(path.dirname(GH_TRENDING_PATH), { recursive: true });
  fs.writeFileSync(GH_TRENDING_PATH, JSON.stringify(snap, null, 2) + "\n", "utf8");
  return { written: repos.length, counts, failed };
}

const isCli = process.argv[1]
  ? path.basename(process.argv[1]).replace(/\.(ts|js|mjs)$/, "") === "crawlGithub"
  : false;
if (isCli) {
  const t0 = Date.now();
  runGithubTrending()
    .then((r) => {
      console.log(
        `[gh-trending] ${r.written} AI repos (trending scanned ${r.counts.trending}, paper ${r.counts.paper}, discovered ${r.counts.discover}) → ${GH_TRENDING_PATH}`,
      );
      for (const f of r.failed) console.log(`  ✗ ${f}`);
      console.log(`[gh-trending] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
