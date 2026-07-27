import type { AIItem, CategoryKey } from "./types";
import { CATEGORIES } from "./categories";

export interface WeeklySection {
  label: string;
  key: CategoryKey;
  items: AIItem[];
  aiSummary: string;
}

export interface DailyBreakdown {
  date: string;
  count: number;
}

export interface WeeklyReport {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalItems: number;
  topItems: AIItem[];
  sections: WeeklySection[];
  topSources: { name: string; count: number }[];
  dailyBreakdown: DailyBreakdown[];
  categoryBreakdown: { key: CategoryKey; label: string; count: number }[];
  topSummary: string;
  weeklyInsight?: string;
  prevTotalItems?: number;
}

// Editorial week = Beijing time, matching the crawler's digest/weekly-insight
// boundaries. Local-midnight + toISOString would shift the label a day back
// for any build machine east of UTC.
const BJ_OFFSET_MS = 8 * 3600_000;

/** UTC-midnight Date whose ISO date equals the Beijing-time Monday of `d`'s week. */
function mondayOf(d: Date): Date {
  const bj = new Date(d.getTime() + BJ_OFFSET_MS); // UTC fields == BJ wall clock
  const day = bj.getUTCDay();
  return new Date(Date.UTC(bj.getUTCFullYear(), bj.getUTCMonth(), bj.getUTCDate() - day + (day === 0 ? -6 : 1)));
}

function generateSectionSummary(items: AIItem[], label: string): string {
  if (items.length === 0) return "";
  const titles = items.slice(0, 3).map((i) => i.title);
  const notes = items.filter((i) => i.aiNote).slice(0, 2).map((i) => i.aiNote!);
  if (notes.length > 0) return notes.join("；");
  return `本周${label}方向共 ${items.length} 条动态，重点包括：${titles.join("、")}。`;
}

export function buildWeeklyReport(items: AIItem[], weekOffset = 0): WeeklyReport {
  const now = new Date();
  const thisMonday = mondayOf(now);
  const targetMonday = new Date(thisMonday);
  targetMonday.setUTCDate(targetMonday.getUTCDate() - weekOffset * 7);
  const targetSunday = new Date(targetMonday);
  targetSunday.setUTCDate(targetSunday.getUTCDate() + 6);

  const startStr = targetMonday.toISOString().slice(0, 10);
  const endStr = targetSunday.toISOString().slice(0, 10);

  const weekItems = items.filter((i) => {
    const d = (i.publishedAt ?? i.firstSeen ?? "").slice(0, 10);
    return d >= startStr && d <= endStr;
  });

  const byHeat = [...weekItems].sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0));
  const MAX_PER_SOURCE = 4;
  const topItems: AIItem[] = [];
  const srcCount = new Map<string, number>();
  for (const item of byHeat) {
    if (topItems.length >= 10) break;
    const n = srcCount.get(item.source) ?? 0;
    if (n >= MAX_PER_SOURCE) continue;
    srcCount.set(item.source, n + 1);
    topItems.push(item);
  }

  const sections: WeeklySection[] = CATEGORIES.map((c) => {
    const catItems = weekItems
      .filter((i) => i.category === c.key)
      .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0));
    return {
      label: c.label,
      key: c.key,
      items: catItems.slice(0, 5),
      aiSummary: generateSectionSummary(catItems, c.label),
    };
  });

  const srcMap = new Map<string, number>();
  for (const i of weekItems) srcMap.set(i.source, (srcMap.get(i.source) ?? 0) + 1);
  const topSources = [...srcMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Daily breakdown
  const dayMap = new Map<string, number>();
  for (let d = new Date(targetMonday); d <= targetSunday; d.setUTCDate(d.getUTCDate() + 1)) {
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const i of weekItems) {
    const d = (i.publishedAt ?? i.firstSeen ?? "").slice(0, 10);
    if (dayMap.has(d)) dayMap.set(d, dayMap.get(d)! + 1);
  }
  const dailyBreakdown = [...dayMap.entries()].map(([date, count]) => ({ date, count }));

  // Category breakdown
  const categoryBreakdown = CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    count: weekItems.filter((i) => i.category === c.key).length,
  }));

  // Top summary — clean punctuation
  const topNotes = topItems
    .filter((i) => i.aiNote)
    .slice(0, 3)
    .map((i) => i.aiNote!.replace(/[。；！？.;!?]+$/g, ""));
  const topTitles = topItems.slice(0, 3).map((i) => i.title);
  const topSummary = topNotes.length >= 2
    ? `${topNotes.join("；")}。`
    : topItems.length > 0
      ? `本周共收录 ${weekItems.length} 条资讯，热度最高的包括「${topTitles.join("」「")}」。`
      : "";

  return {
    weekLabel: `${startStr} ~ ${endStr}`,
    startDate: startStr,
    endDate: endStr,
    totalItems: weekItems.length,
    topItems,
    sections,
    topSources,
    dailyBreakdown,
    categoryBreakdown,
    topSummary,
  };
}
