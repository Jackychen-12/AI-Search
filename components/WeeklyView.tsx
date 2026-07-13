"use client";

import { useState } from "react";
import Link from "next/link";
import type { WeeklyReport } from "@/lib/weekly";

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-brand-800 dark:text-brand-400">{p}</strong> : p
  );
}

function InsightSection({ markdown }: { markdown: string }) {
  const cleaned = markdown.replace(/^# .+\n?/gm, "");
  const blocks = cleaned.split(/^## /m).filter((b) => b.trim());
  return (
    <div className="space-y-3">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const title = lines[0]?.trim();
        const body = lines.slice(1);
        return (
          <div key={bi} className="bg-white dark:bg-gray-800/60 rounded-lg p-4 shadow-sm">
            {title && (
              <h3 className="inline-block bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 rounded-md px-3 py-1 text-sm font-semibold mb-3">
                {title}
              </h3>
            )}
            <div className="space-y-1.5">
              {body.map((line, li) => {
                const numbered = line.match(/^\d+\.\s+(.+)/);
                const bulleted = line.match(/^[-*]\s+(.+)/);
                if (numbered) {
                  return (
                    <div key={li} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 grid place-items-center text-[10px] font-bold mt-0.5">
                        {line.match(/^(\d+)/)?.[1]}
                      </span>
                      <span className="flex-1">{parseBold(numbered[1])}</span>
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
                    <h4 key={li} className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-2">
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

function MiniBar({ data, color = "#3b6cff", labels }: { data: number[]; color?: string; labels?: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-20">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] text-gray-500 tabular-nums">{v || ""}</span>
            <div
              className="w-full rounded-sm min-h-[2px] transition-all"
              style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.8 }}
            />
          </div>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between mt-1.5">
          {labels.map((l, i) => (
            <span key={i} className="flex-1 text-center text-[9px] text-gray-400">{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  badge,
  popover,
}: {
  value: string | number;
  label: string;
  badge?: React.ReactNode;
  popover?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onClick={() => popover && setOpen((o) => !o)}
      onBlur={() => setOpen(false)}
      tabIndex={popover ? 0 : undefined}
    >
      <div className={"card p-4 text-center transition-colors " + (popover ? "cursor-pointer hover:border-brand-500" : "cursor-default")}>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-2xl font-bold text-brand-600 dark:text-brand-500">{value}</span>
          {badge}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
      </div>
      {popover && (
        <div
          className={
            "absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 transition-all duration-200 " +
            (open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none")
          }
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white dark:bg-gray-900 border-l border-t border-gray-200 dark:border-gray-700" />
          {popover}
        </div>
      )}
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
  const report = reports[idx];
  if (!report) return <p className="text-gray-500">暂无周报数据</p>;

  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  const dayLabels = report.dailyBreakdown.map((_, i) => weekdays[i] ?? "");
  const topHeat = report.topItems[0]?.heat ?? 0;

  return (
    <div>
      {/* Week selector */}
      {reports.length > 1 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
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
            </button>
          ))}
        </div>
      )}

      {/* Stats with click-toggle popovers */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          value={report.totalItems}
          label="本周资讯总量"
          badge={<TrendBadge current={report.totalItems} previous={report.prevTotalItems} />}
          popover={
            <div>
              <h4 className="text-xs font-semibold dark:text-gray-100 mb-3">每日资讯分布</h4>
              <MiniBar
                data={report.dailyBreakdown.map((d) => d.count)}
                labels={dayLabels}
              />
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 flex justify-between">
                <span>日均 {report.totalItems > 0 ? Math.round(report.totalItems / report.dailyBreakdown.length) : 0} 条</span>
                <span>峰值 {Math.max(...report.dailyBreakdown.map((d) => d.count))} 条</span>
              </div>
            </div>
          }
        />

        <StatCard
          value={report.topSources.length}
          label="活跃来源"
          popover={
            <div>
              <h4 className="text-xs font-semibold dark:text-gray-100 mb-3">来源贡献排名</h4>
              <div className="space-y-2">
                {report.topSources.slice(0, 6).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-3 text-right">{i + 1}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-200 truncate flex-1">{s.name}</span>
                    <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(s.count / (report.topSources[0]?.count || 1)) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 tabular-nums w-5 text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        <StatCard
          value={topHeat > 0 ? topHeat.toLocaleString() : "—"}
          label="最高热度"
          popover={report.topItems[0] ? (
            <div>
              <h4 className="text-xs font-semibold dark:text-gray-100 mb-2">本周最热</h4>
              <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">{report.topItems[0].title}</p>
              <p className="text-[11px] text-gray-400 mt-1">{report.topItems[0].source}</p>
            </div>
          ) : undefined}
        />
      </div>

      {/* AI Weekly Insight — unified section */}
      {(report.weeklyInsight || report.topSummary) && (
        <div className="bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 rounded-xl px-5 py-4 mb-6">
          <h2 className="text-sm font-semibold text-brand-700 dark:text-brand-500 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-brand-500 text-white grid place-items-center text-[10px] font-bold">AI</span>
            {report.weeklyInsight ? "AI 周度洞察" : "本周重点"}
          </h2>
          {report.weeklyInsight ? (
            <InsightSection markdown={report.weeklyInsight} />
          ) : (
            <p className="text-sm text-brand-800 dark:text-brand-400 leading-relaxed">{report.topSummary}</p>
          )}
        </div>
      )}

      {/* Top 10 */}
      <section className="card p-5 mb-6">
        <h2 className="text-sm font-semibold dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-500 rounded-sm" />
          本周 Top 10
        </h2>
        {report.topItems.length === 0 ? (
          <p className="text-sm text-gray-500">本周暂无数据</p>
        ) : (
          <ol className="divide-y divide-gray-100 dark:divide-gray-800">
            {report.topItems.map((item, i) => (
              <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={
                    "shrink-0 w-6 h-6 grid place-items-center rounded-md font-mono text-xs font-semibold " +
                    (i < 3 ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400")
                  }
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-brand-600 line-clamp-2">
                    {item.title}
                  </a>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                    <span>{item.source}</span>
                    {typeof item.heat === "number" && item.heat > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {item.origin === "github" ? `★ ${item.heat.toLocaleString()}` : item.heat.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {(item.aiNote || item.summary) && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{item.aiNote || item.summary}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Footer navigation */}
      <nav className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400 py-4">
        <Link href="/" className="hover:text-brand-600 transition-colors">← 返回首页</Link>
        <Link href="/daily" className="hover:text-brand-600 transition-colors">查看日报</Link>
        <Link href="/feed.xml" className="hover:text-brand-600 transition-colors">RSS 订阅</Link>
      </nav>
    </div>
  );
}
