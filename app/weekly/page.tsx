import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import Header from "@/components/Header";
import WeeklyView from "@/components/WeeklyView";
import T from "@/components/T";
import { WEEKLY_INSIGHT_PATH, WEEKLY_INSIGHTS_DIR } from "@/lib/config";
import { readArchive } from "@/lib/archive";
import { readLocalItems } from "@/lib/localStore";
import { buildWeeklyReport } from "@/lib/weekly";
import { abs } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI 周报",
  description: "每周自动汇编的 AI 行业周报：本周 Top 10、分类精选、活跃来源一览。",
  alternates: { canonical: abs("/weekly") },
};

export default function WeeklyPage() {
  const archive = readArchive();
  const items = archive.length > 0 ? archive : readLocalItems();
  const reports = [];
  for (let i = 0; i < 6; i++) {
    const r = buildWeeklyReport(items, i);
    if (r.totalItems > 0) reports.push(r);
  }

  // Attach LLM-generated weekly insight to matching reports. Keyed by week
  // START date (label prefix) — legacy files carry UTC-based labels whose end
  // date can drift a day from the current Beijing-time labels, so exact
  // whole-label matching silently dropped insights.
  const insightMap = new Map<string, string>();
  try {
    const files = fs.readdirSync(WEEKLY_INSIGHTS_DIR).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const raw = fs.readFileSync(path.join(WEEKLY_INSIGHTS_DIR, f), "utf8");
      const data = JSON.parse(raw) as { weekLabel: string; insight: string };
      if (data.insight) insightMap.set(data.weekLabel.slice(0, 10), data.insight);
    }
  } catch {
    // Directory doesn't exist yet — try legacy single file
    try {
      const raw = fs.readFileSync(WEEKLY_INSIGHT_PATH, "utf8");
      const data = JSON.parse(raw) as { weekLabel: string; insight: string };
      if (data.insight) insightMap.set(data.weekLabel.slice(0, 10), data.insight);
    } catch { /* no insights available */ }
  }
  for (const r of reports) {
    const insight = insightMap.get(r.startDate);
    if (insight) r.weeklyInsight = insight;
  }

  // Compute week-over-week trend
  for (let i = 0; i < reports.length - 1; i++) {
    reports[i].prevTotalItems = reports[i + 1].totalItems;
  }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-brand-600"><T k="common.back" /></Link>
        </div>
        <h1 className="text-2xl font-bold dark:text-gray-100 mb-1"><T k="weekly.title" /></h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <T k="weekly.subtitle" />
        </p>
        <WeeklyView reports={reports} />
      </main>
    </>
  );
}
