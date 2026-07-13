import type { Metadata } from "next";
import fs from "node:fs";
import Link from "next/link";
import Header from "@/components/Header";
import WeeklyView from "@/components/WeeklyView";
import { WEEKLY_INSIGHT_PATH } from "@/lib/config";
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

  // Attach LLM-generated weekly insight to the matching report
  try {
    const raw = fs.readFileSync(WEEKLY_INSIGHT_PATH, "utf8");
    const data = JSON.parse(raw) as { weekLabel: string; insight: string };
    if (data.insight) {
      const match = reports.find((r) => r.weekLabel === data.weekLabel);
      if (match) match.weeklyInsight = data.insight;
    }
  } catch {
    // No insight file yet — that's fine
  }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-brand-600">← 返回首页</Link>
        </div>
        <h1 className="text-2xl font-bold dark:text-gray-100 mb-1">AI 周报</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          每周自动汇编，回顾本周 AI 行业重点
        </p>
        <WeeklyView reports={reports} />
      </main>
    </>
  );
}
