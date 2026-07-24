import { fetchDaily, fetchDailies } from "./aihot";
import { readArchive } from "./archive";
import { CATEGORIES } from "./categories";
import { getDataSourceMode } from "./config";
import { hasFreshLocalData, readLocalItems, readStoreMeta } from "./localStore";
import { MOCK_ITEMS } from "./mockData";
import type { AIItem, DailyIndexItem, DailyReport, DataOrigin } from "./types";

const ITEMS_PER_SECTION = 6;
const FLASH_COUNT = 6;
const FEATURED_COUNT = 6;

function dayOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

const DAILY_ARCHIVE_DAYS = 30;
const MIN_DAILY_ITEMS = 3;

/** Merge current items + archive, deduped by id, to ensure full daily coverage. */
function fullPool(): AIItem[] {
  const items = readLocalItems();
  const archive = readArchive();
  const seen = new Set(items.map((i) => i.id));
  const merged = [...items];
  for (const a of archive) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      merged.push(a);
    }
  }
  return merged;
}

/**
 * Collection dates (firstSeen) worth showing as a daily: within the recent window
 * and with enough items. Filters out ancient publish-date artifacts and near-empty
 * days, so the archive only lists real, substantial reports.
 */
function distinctDatesDesc(items: AIItem[]): string[] {
  const counts = new Map<string, number>();
  for (const i of items) {
    const d = dayOf(i.firstSeen);
    if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const cutoff = new Date(Date.now() - DAILY_ARCHIVE_DAYS * 86400000).toISOString().slice(0, 10);
  return [...counts.entries()]
    .filter(([d, n]) => d >= cutoff && n >= MIN_DAILY_ITEMS)
    .map(([d]) => d)
    .sort((a, b) => b.localeCompare(a));
}

/** Headline for a digest: newest item that has a summary (real lead paragraph),
 *  falling back to the newest item. Avoids GitHub repos (no summary, huge heat)
 *  dominating the lead purely by star count. */
function pickLead(items: AIItem[]): AIItem | null {
  if (items.length === 0) return null;
  const byTime = [...items].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return byTime.find((i) => i.summary) ?? byTime[0];
}

// ---- local store -> DailyReport ------------------------------------------

function buildLocalDaily(
  date: string,
  dayItems: AIItem[],
  generatedAt: string,
  windowStart: string,
  windowEnd: string,
): DailyReport {
  // 重点优先：热度高的（GitHub stars / HN points）在前，其次按收录/发布新近度。
  const byImportance = (a: AIItem, b: AIItem) =>
    (b.heat ?? 0) - (a.heat ?? 0) ||
    (b.publishedAt ?? b.firstSeen ?? "").localeCompare(a.publishedAt ?? a.firstSeen ?? "");

  const featured = [...dayItems]
    .filter((i) => i.aiSelected !== false)
    .sort(byImportance)
    .slice(0, FEATURED_COUNT)
    .map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.summary,
      aiNote: i.aiNote ?? null,
      sourceUrl: i.sourceUrl,
      sourceName: i.source,
      category: i.category,
    }));

  const sections = CATEGORIES.map((c) => {
    const pool = dayItems.filter((i) => i.category === c.key).sort(byImportance).slice(0, ITEMS_PER_SECTION);
    return {
      label: c.label,
      items: pool.map((i) => ({
        id: i.id,
        title: i.title,
        summary: i.summary,
        aiNote: i.aiNote ?? null,
        sourceUrl: i.sourceUrl,
        sourceName: i.source,
      })),
    };
  });

  // Data summary, not an editorial — makes clear the report is auto-compiled from
  // what we collected today, not written by an AI.
  const lead =
    dayItems.length > 0
      ? {
          title: `${date} · AI 资讯日报`,
          leadParagraph: `今日新收录 ${dayItems.length} 条公开资讯，按模型 / 产品 / 行业 / 论文 / 观点 自动归类汇编（非 AI 生成，点击可溯源原文）。`,
        }
      : null;

  const flashes = [...dayItems]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, FLASH_COUNT)
    .map((i) => ({
      title: i.title,
      sourceName: i.source,
      sourceUrl: i.sourceUrl,
      publishedAt: i.publishedAt ?? "",
    }));

  return {
    date,
    generatedAt,
    windowStart,
    windowEnd,
    newCount: dayItems.length,
    lead,
    featured,
    sections,
    flashes,
  };
}

function localDaily(date?: string): DailyReport | null {
  const items = fullPool();
  if (items.length === 0) return null;
  const target = date || new Date().toISOString().slice(0, 10);
  const dayItems = items.filter((i) => dayOf(i.firstSeen) === target);
  const generatedAt = readStoreMeta()?.fetchedAt || new Date().toISOString();
  return buildLocalDaily(
    target,
    dayItems,
    generatedAt,
    `${target}T00:00:00.000Z`,
    `${target}T23:59:59.999Z`,
  );
}

/** Distinct dates (newest first) present in local + archive — drives static
 *  generation of /daily/[date] pages and prev/next navigation. */
export function listDailyDates(): string[] {
  return distinctDatesDesc(fullPool());
}

function localDailies(take: number): { count: number; items: DailyIndexItem[] } | null {
  const items = fullPool();
  if (items.length === 0) return null;
  const generatedAt = readStoreMeta()?.fetchedAt || new Date().toISOString();
  const out: DailyIndexItem[] = distinctDatesDesc(items)
    .slice(0, take)
    .map((date) => {
      const lead = pickLead(items.filter((i) => dayOf(i.firstSeen) === date));
      return { date, generatedAt, leadTitle: lead?.title ?? null };
    });
  return { count: out.length, items: out };
}

// ---- mock fallback --------------------------------------------------------

function mockDaily(date?: string): DailyReport {
  const today = date || new Date().toISOString().slice(0, 10);
  const start = new Date(today);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  const sections = CATEGORIES.map((c) => {
    const pool = MOCK_ITEMS.filter((i) => i.category === c.key).slice(0, 4);
    return {
      label: c.label,
      items: pool.map((i) => ({
        id: i.id,
        title: i.title,
        summary: i.summary,
        aiNote: i.aiNote ?? null,
        sourceUrl: i.sourceUrl,
        sourceName: i.source,
      })),
    };
  });
  return {
    date: today,
    generatedAt: new Date().toISOString(),
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    newCount: sections.reduce((sum, s) => sum + s.items.length, 0),
    lead: {
      title: "演示版 AI 日报",
      leadParagraph: "当前为本地演示数据。运行 npm run crawl 抓取真实数据后将展示由真实条目生成的日报。",
    },
    sections,
    flashes: [],
  };
}

function mockDailies(take: number): { count: number; items: DailyIndexItem[] } {
  const items: DailyIndexItem[] = [];
  for (let i = 0; i < take; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    items.push({
      date: d.toISOString().slice(0, 10),
      generatedAt: d.toISOString(),
      leadTitle: i === 0 ? "演示版 AI 日报" : `演示日报 ${i}`,
    });
  }
  return { count: items.length, items };
}

// ---- public API -----------------------------------------------------------

export interface DailyResult {
  daily: DailyReport;
  source: DataOrigin;
  fallbackReason?: string;
}

export async function getDaily(date?: string): Promise<DailyResult> {
  const mode = getDataSourceMode();
  if (mode === "mock") return { daily: mockDaily(date), source: "mock" };
  if (mode === "local") {
    const daily = localDaily(date);
    return daily
      ? { daily, source: "local" }
      : { daily: mockDaily(date), source: "mock", fallbackReason: "本地快照为空，请先运行 npm run crawl" };
  }
  if (mode === "aihot") return { daily: await fetchDaily(date), source: "aihot" };

  // auto
  if (hasFreshLocalData()) {
    const daily = localDaily(date);
    if (daily) return { daily, source: "local" };
  }
  try {
    return { daily: await fetchDaily(date), source: "aihot" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { daily: mockDaily(date), source: "mock", fallbackReason: msg.slice(0, 200) };
  }
}

export interface DailiesResult {
  count: number;
  items: DailyIndexItem[];
  source: DataOrigin;
  fallbackReason?: string;
}

export async function getDailies(take = 14): Promise<DailiesResult> {
  const mode = getDataSourceMode();
  if (mode === "mock") return { ...mockDailies(take), source: "mock" };
  if (mode === "local") {
    const r = localDailies(take);
    return r ? { ...r, source: "local" } : { ...mockDailies(take), source: "mock" };
  }
  if (mode === "aihot") return { ...(await fetchDailies(take)), source: "aihot" };

  // auto
  if (hasFreshLocalData()) {
    const r = localDailies(take);
    if (r) return { ...r, source: "local" };
  }
  try {
    return { ...(await fetchDailies(take)), source: "aihot" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ...mockDailies(take), source: "mock", fallbackReason: msg.slice(0, 200) };
  }
}
