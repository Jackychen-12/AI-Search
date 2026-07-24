/**
 * Generate static JSON API endpoints at public/api/v1/
 * Run during prebuild so they're included in the static export.
 */
import fs from "node:fs";
import path from "node:path";
import { readArchive } from "../lib/archive";
import { buildStories } from "../lib/stories";
import type { AIItem } from "../lib/types";

const DATA_DIR = path.resolve("data");
const API_DIR = path.resolve("public/api/v1");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeApi(name: string, data: unknown) {
  const file = path.join(API_DIR, name);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data));
  console.log(`[api] wrote ${file}`);
}

interface Item {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  sourceUrl: string;
  category: string | null;
  publishedAt: string | null;
  firstSeen?: string | null;
  aiNote?: string | null;
  heat?: number;
  origin?: string;
  image?: string | null;
}

function main() {
  const items = (readJson(path.join(DATA_DIR, "items.json")) ?? []) as Item[];
  const meta = readJson(path.join(DATA_DIR, "meta.json"));
  const digest = readJson(path.join(DATA_DIR, "digest.json"));

  // 1. All items (latest 500)
  writeApi("items.json", items.slice(0, 500));

  // 2. Meta
  writeApi("meta.json", meta);

  // 3. Digest
  if (digest) writeApi("digest.json", digest);

  // 4. Daily reports — group by firstSeen date
  const byDate = new Map<string, Item[]>();
  for (const item of items) {
    const d = (item.firstSeen ?? item.publishedAt ?? "").slice(0, 10);
    if (!d) continue;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(item);
  }

  const dates = [...byDate.keys()].sort().reverse();

  // Generate per-date JSON
  for (const date of dates.slice(0, 30)) {
    writeApi(`daily/${date}.json`, {
      date,
      count: byDate.get(date)!.length,
      items: byDate.get(date),
    });
  }

  // Latest daily
  if (dates.length > 0) {
    writeApi("daily/latest.json", {
      date: dates[0],
      count: byDate.get(dates[0])!.length,
      items: byDate.get(dates[0]),
    });
  }

  // 5. Index — available dates
  writeApi("daily/index.json", dates.slice(0, 30));

  // 6. By category
  const categories = ["ai-models", "ai-products", "industry", "paper", "tip"];
  for (const cat of categories) {
    const catItems = items.filter((i) => i.category === cat).slice(0, 100);
    writeApi(`category/${cat}.json`, catItems);
  }

  // 7. Sources list
  const srcMap = new Map<string, number>();
  for (const i of items) srcMap.set(i.source, (srcMap.get(i.source) ?? 0) + 1);
  const sources = [...srcMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
  writeApi("sources.json", sources);

  // 8. Storylines — cross-source event clusters (top 50, agent-friendly)
  const stories = buildStories([...(items as unknown as AIItem[]), ...readArchive()]).slice(0, 50);
  writeApi("stories.json", stories);

  console.log(
    `[api] done — ${items.length} items, ${dates.length} dates, ${sources.length} sources, ${stories.length} stories`,
  );
}

main();
