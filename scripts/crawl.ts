/**
 * Crawl orchestrator.
 *
 * Run with:  npm run crawl              (all default sources)
 *            npm run crawl -- --only=hf,github
 *            CRAWL_ARXIV=1 npm run crawl (include rate-limited arXiv)
 *
 * Fetches every source adapter in parallel (one failure never sinks the run),
 * merges + dedupes + classifies the results, and writes data/items.json +
 * data/meta.json. Runs locally (npm run crawl) and in CI before the static build.
 */
import fs from "node:fs";
import path from "node:path";
import type { AIItem } from "../lib/types";
import { WEEKLY_INSIGHT_PATH, WEEKLY_INSIGHTS_DIR } from "../lib/config";
import { normalizeItems } from "../lib/classify";
import { sanitizeItems } from "../lib/validate";
import { addAiNotes } from "./lib/aiNote";
import { updateArchive } from "./lib/archive";
import { buildDigest, buildWeeklyInsight } from "./lib/digest";
import { applyHistory, dedupeAndSort, loadPrevious, writeSnapshot } from "./lib/persist";
import { bjWeekRange } from "./lib/time";
import { arxiv } from "./sources/arxiv";
import { github } from "./sources/github";
import { hackernews } from "./sources/hackernews";
import { hfPapers } from "./sources/hfPapers";
import { rssAdapters } from "./sources/rss";
import type { SourceAdapter } from "./sources/types";
import { computeHeat } from "./lib/heat";

export interface CrawlResult {
  total: number;
  written: number;
  sources: Record<string, number>;
  errors: Record<string, string>;
  path: string;
}

function selectAdapters(only: string[]): SourceAdapter[] {
  const universe: SourceAdapter[] = [hfPapers, github, hackernews, ...rssAdapters, arxiv];
  if (only.length > 0) {
    return universe.filter((a) => only.some((o) => a.id === o || a.id.startsWith(o)));
  }
  // arXiv is opt-in (rate-limited); excluded from the default run.
  return universe.filter((a) => a.id !== "arxiv" || process.env.CRAWL_ARXIV === "1");
}

export async function runCrawl(only: string[] = []): Promise<CrawlResult> {
  const adapters = selectAdapters(only);
  const sources: Record<string, number> = {};
  const errors: Record<string, string> = {};
  const all: AIItem[] = [];

  const settled = await Promise.allSettled(
    adapters.map(async (a) => ({ id: a.id, items: await a.fetch() })),
  );
  settled.forEach((r, i) => {
    const a = adapters[i];
    if (r.status === "fulfilled") {
      sources[r.value.id] = r.value.items.length;
      all.push(...r.value.items);
    } else {
      sources[a.id] = 0;
      errors[a.id] = String(r.reason?.message ?? r.reason).slice(0, 200);
    }
  });

  const prev = loadPrevious();
  // Schema guard first: drop/clamp anything malformed BEFORE it can reach the
  // snapshot, the append-only archive or the open API.
  const { items: safe, dropped } = sanitizeItems(all);
  if (dropped > 0) errors["validator"] = `dropped ${dropped} malformed item(s)`;
  let merged = normalizeItems(dedupeAndSort(safe));
  merged = applyHistory(merged, prev, new Date().toISOString());
  // Unified 0-100 heat: tier base + in-source engagement percentile × freshness.
  const tiers = Object.fromEntries(adapters.map((a) => [a.id, a.tier]));
  merged = computeHeat(merged, tiers);
  merged = await addAiNotes(merged); // new items only; no-op without DEEPSEEK_API_KEY
  const { count, path: outPath } = writeSnapshot(merged, sources, errors);
  const arch = updateArchive(merged); // append-only history (monthly shards)
  console.log(`[archive] ${arch.total} items across ${Object.keys(arch.months).length} month(s)`);
  await buildDigest(merged); // "AI 每日必读" — once/day, no-op without DEEPSEEK_API_KEY

  // Weekly insight — current Beijing-time week (must match the digest's day
  // boundary; UTC here would mislabel Sunday-night crawls as last week).
  const { startDate, endDate } = bjWeekRange();
  const insight = await buildWeeklyInsight(merged, startDate, endDate);
  if (insight) {
    fs.writeFileSync(
      WEEKLY_INSIGHT_PATH,
      JSON.stringify({ weekLabel: `${startDate} ~ ${endDate}`, insight, generatedAt: new Date().toISOString() }, null, 2) + "\n",
      "utf8",
    );
    fs.mkdirSync(WEEKLY_INSIGHTS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(WEEKLY_INSIGHTS_DIR, `${startDate}.json`),
      JSON.stringify({ weekLabel: `${startDate} ~ ${endDate}`, insight, generatedAt: new Date().toISOString() }, null, 2) + "\n",
      "utf8",
    );
    console.log(`[weekly-insight] saved to ${WEEKLY_INSIGHT_PATH} + ${WEEKLY_INSIGHTS_DIR}/${startDate}.json`);
  }

  return { total: all.length, written: count, sources, errors, path: outPath };
}

function parseOnly(argv: string[]): string[] {
  const arg = argv.find((a) => a.startsWith("--only="));
  if (!arg) return [];
  return arg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const only = parseOnly(process.argv.slice(2));
  console.log(`[crawl] starting${only.length ? ` (only: ${only.join(", ")})` : ""} ...`);
  const t0 = Date.now();
  const res = await runCrawl(only);

  console.log("[crawl] per-source:");
  for (const [id, n] of Object.entries(res.sources)) {
    const err = res.errors[id] ? `  ✗ ${res.errors[id]}` : "";
    console.log(`  - ${id.padEnd(16)} ${String(n).padStart(3)}${err}`);
  }
  console.log(`[crawl] merged ${res.total} -> ${res.written} unique items`);
  console.log(`[crawl] wrote ${res.path}`);
  console.log(`[crawl] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Dead-source alerting: annotate every failed source in the Actions UI and
  // fail the step when too many are down, so feed rot can't go unnoticed.
  const sourceErrors = Object.keys(res.errors).filter((k) => k !== "validator");
  const maxDead = Number(process.env.CRAWL_MAX_DEAD_SOURCES || 5);
  if (process.env.GITHUB_ACTIONS === "true") {
    for (const id of sourceErrors) {
      console.log(`::warning title=Dead source ${id}::${res.errors[id]}`);
    }
  }
  if (sourceErrors.length > maxDead) {
    console.error(
      `[crawl] ${sourceErrors.length} source(s) failing (threshold ${maxDead}) — fix or remove dead feeds.`,
    );
    process.exitCode = 1;
  }
  if (res.written === 0) process.exitCode = 1;
}

// Run only when executed as the CLI entry (not when imported by the API route).
const isCli = process.argv[1]
  ? path.basename(process.argv[1]).replace(/\.(ts|js|mjs)$/, "") === "crawl"
  : false;
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
