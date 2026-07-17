"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/categories";
import type { WeeklyReport } from "@/lib/weekly";

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-brand-800 dark:text-brand-400">{p}</strong> : p
  );
}

const CAT_COLORS: Record<string, { border: string; bg: string; text: string; bar: string }> = {
  "ai-models": { border: "border-l-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", bar: "bg-blue-500" },
  "ai-products": { border: "border-l-violet-500", bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-400", bar: "bg-violet-500" },
  "industry": { border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", bar: "bg-amber-500" },
  "paper": { border: "border-l-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" },
  "tip": { border: "border-l-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", bar: "bg-rose-500" },
};

function InsightSection({ markdown }: { markdown: string }) {
  const cleaned = markdown.replace(/^# .+\n?/gm, "").replace(/[（(]?#\d+[,、]\s*#?\d*[)）]?/g, "").replace(/#\d+/g, "");
  const firstH2 = cleaned.indexOf("## ");
  const trimmed = firstH2 > 0 ? cleaned.slice(firstH2) : cleaned;
  const blocks = trimmed.split(/^## /m).filter((b) => b.trim());
  return (
    <div className="space-y-5">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const title = lines[0]?.trim();
        const body = lines.slice(1);
        return (
          <div key={bi}>
            {title && (
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 pl-3 border-l-2 border-brand-500">
                {title}
              </h3>
            )}
            <div className="space-y-3">
              {body.map((line, li) => {
                const numbered = line.match(/^\d+\.\s+(.+)/);
                const bulleted = line.match(/^[-*]\s+(.+)/);
                const subBulleted = line.match(/^\s+[-*]\s+(.+)/);
                if (numbered) {
                  return (
                    <div key={li} className="flex gap-2.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 grid place-items-center text-[10px] font-bold mt-0.5">
                        {line.match(/^(\d+)/)?.[1]}
                      </span>
                      <span className="flex-1">{parseBold(numbered[1])}</span>
                    </div>
                  );
                }
                if (subBulleted) {
                  return (
                    <div key={li} className="flex gap-2 text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed ml-7">
                      <span className="shrink-0 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 mt-2" />
                      <span className="flex-1">{parseBold(subBulleted[1])}</span>
                    </div>
                  );
                }
                if (bulleted) {
                  return (
                    <div key={li} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400 dark:bg-brand-500 mt-2" />
                      <span className="flex-1">{parseBold(bulleted[1])}</span>
                    </div>
                  );
                }
                if (line.match(/^###\s+/)) {
                  return (
                    <h4 key={li} className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-3 mb-1">
                      {line.replace(/^###\s+/, "")}
                    </h4>
                  );
                }
                return (
                  <p key={li} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {parseBold(line)}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendBadge({ current, previous }: { current: number; previous?: number }) {
  if (previous == null || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return null;
  const up = pct > 0;
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${up ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}>
      {up ? "↑" : "↓"}{Math.abs(pct)}%
    </span>
  );
}

function formatWeekLabel(label: string, isCurrent: boolean): string {
  const m = label.match(/(\d{4})-(\d{2})-(\d{2}) ~ \d{4}-(\d{2})-(\d{2})/);
  if (!m) return label;
  const short = `${m[2]}.${m[3]}-${m[4]}.${m[5]}`;
  return isCurrent ? `本周 (${short})` : short;
}

export default function WeeklyView({
  reports,
}: {
  reports: WeeklyReport[];
}) {
  const [idx, setIdx] = useState(0);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(["ai-models", "ai-products"]));
  const report = reports[idx];
  if (!report) return <p className="text-gray-500">暂无周报数据</p>;

  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  const dayLabels = report.dailyBreakdown.map((_, i) => weekdays[i] ?? "");
  const topHeat = report.topItems[0]?.heat ?? 0;
  const dailyAvg = report.totalItems > 0 ? Math.round(report.totalItems / 7) : 0;
  const maxDaily = Math.max(...report.dailyBreakdown.map((d) => d.count), 1);
  const maxCat = Math.max(...report.categoryBreakdown.map((c) => c.count), 1);
  const maxSource = report.topSources[0]?.count ?? 1;

  function toggleCat(key: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Week selector */}
      {reports.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {reports.map((r, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={
                "px-3 py-1.5 rounded-md text-xs font-medium transition " +
                (i === idx
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700")
              }
            >
              {formatWeekLabel(r.weekLabel, i === 0)}
              <span className="ml-1 opacity-60">({r.totalItems})</span>
            </button>
          ))}
        </div>
      )}

      {/* ═══ A. Data Dashboard ═══ */}
      <section className="card p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">关键数据速览</h2>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-3xl font-bold text-brand-600 dark:text-brand-500 tabular-nums">{report.totalItems}</span>
              <TrendBadge current={report.totalItems} previous={report.prevTotalItems} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">资讯总量</div>
          </div>
          <div className="text-center">
            <span className="text-3xl font-bold text-gray-800 dark:text-gray-200 tabular-nums">{dailyAvg}</span>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">日均资讯</div>
          </div>
          <div className="text-center">
            <span className="text-3xl font-bold text-gray-800 dark:text-gray-200 tabular-nums">{report.topSources.length}</span>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">活跃来源</div>
          </div>
          <div className="text-center">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{topHeat > 0 ? topHeat.toLocaleString() : "—"}</span>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">最高热度</div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          {/* Daily trend */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3">每日趋势</h3>
            <div className="flex items-end gap-1.5" style={{ height: 96 }}>
              {report.dailyBreakdown.map((d, i) => {
                const barH = maxDaily > 0 ? Math.max(2, Math.round((d.count / maxDaily) * 64)) : 2;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <span className="text-[10px] text-gray-500 tabular-nums">{d.count || ""}</span>
                    <div
                      className="w-full rounded-t bg-brand-500/80 dark:bg-brand-400/60"
                      style={{ height: barH }}
                    />
                    <span className="text-[10px] text-gray-400">{dayLabels[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category breakdown */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3">分类占比</h3>
            <div className="space-y-2">
              {report.categoryBreakdown.filter((c) => c.count > 0).map((c) => {
                const cat = CAT_COLORS[c.key];
                return (
                  <div key={c.key} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-600 dark:text-gray-300 w-20 truncate">{c.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cat?.bar ?? "bg-gray-400"}`} style={{ width: `${(c.count / maxCat) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 tabular-nums w-5 text-right">{c.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Source ranking */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3">来源贡献 Top 5</h3>
            <div className="space-y-2">
              {report.topSources.slice(0, 5).map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-3 text-right">{i + 1}</span>
                  <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate flex-1">{s.name}</span>
                  <div className="w-16 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500/70 rounded-full" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 tabular-nums w-5 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ B. AI Weekly Insight ═══ */}
      {(report.weeklyInsight || report.topSummary) && (
        <section className="bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 rounded-xl px-5 py-5">
          <h2 className="text-sm font-semibold text-brand-700 dark:text-brand-500 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-brand-500 text-white grid place-items-center text-[10px] font-bold">AI</span>
            {report.weeklyInsight ? "AI 周度洞察" : "本周重点"}
          </h2>
          {report.weeklyInsight ? (
            <InsightSection markdown={report.weeklyInsight} />
          ) : (
            <p className="text-sm text-brand-800 dark:text-brand-400 leading-relaxed">{report.topSummary}</p>
          )}
        </section>
      )}

      {/* ═══ C. Top 10 Events ═══ */}
      <section>
        <h2 className="text-sm font-semibold dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-500 rounded-sm" />
          本周 Top 10
        </h2>
        {report.topItems.length === 0 ? (
          <p className="text-sm text-gray-500">本周暂无数据</p>
        ) : (
          <div className="space-y-3">
            {report.topItems.map((item, i) => {
              const cat = CAT_COLORS[item.category ?? "industry"] ?? CAT_COLORS["industry"];
              const catLabel = CATEGORY_MAP[(item.category ?? "industry") as keyof typeof CATEGORY_MAP]?.label ?? item.category;
              return (
                <div key={item.id} className={`card p-4 border-l-[3px] ${cat.border}`}>
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        "shrink-0 w-7 h-7 grid place-items-center rounded-lg font-mono text-xs font-bold " +
                        (i < 3 ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400")
                      }
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-brand-600 transition-colors leading-snug">
                        {item.title}
                      </a>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${cat.bg} ${cat.text}`}>
                          {catLabel}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{item.source}</span>
                        {typeof item.heat === "number" && item.heat > 0 && (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            {item.origin === "github" ? `★ ${item.heat.toLocaleString()}` : `热度 ${item.heat.toLocaleString()}`}
                          </span>
                        )}
                      </div>
                      {(item.aiNote || item.summary) && (
                        <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                          {item.aiNote || item.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ D. Category Sections ═══ */}
      {report.sections.some((s) => s.items.length > 0) && (
        <section>
          <h2 className="text-sm font-semibold dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-500 rounded-sm" />
            分类概览
          </h2>
          <div className="space-y-3">
            {report.sections.filter((s) => s.items.length > 0).map((sec) => {
              const cat = CAT_COLORS[sec.key] ?? CAT_COLORS["industry"];
              const expanded = expandedCats.has(sec.key);
              return (
                <div key={sec.key} className="card overflow-hidden">
                  <button
                    onClick={() => toggleCat(sec.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left border-l-[3px] ${cat.border} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${cat.text}`}>{sec.label}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{sec.items.length}</span>
                    </div>
                    <span className={`text-gray-400 text-xs transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
                  </button>
                  {expanded && (
                    <div className="px-4 pb-3 divide-y divide-gray-50 dark:divide-gray-800">
                      {sec.items.map((item) => (
                        <div key={item.id} className="py-2.5 first:pt-1">
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-gray-800 dark:text-gray-200 hover:text-brand-600 transition-colors leading-snug">
                            {item.title}
                          </a>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{item.source}</div>
                          {(item.aiNote || item.summary) && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">{item.aiNote || item.summary}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Footer navigation */}
      <nav className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400 py-4">
        <Link href="/" className="hover:text-brand-600 transition-colors">← 返回首页</Link>
        <Link href="/daily" className="hover:text-brand-600 transition-colors">查看日报</Link>
        <Link href="/feed.xml" className="hover:text-brand-600 transition-colors">RSS 订阅</Link>
      </nav>
    </div>
  );
}
