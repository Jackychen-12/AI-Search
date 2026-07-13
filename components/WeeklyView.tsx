"use client";

import { useState } from "react";
import type { WeeklyReport } from "@/lib/weekly";
import { CATEGORY_COLORS } from "@/lib/trends";

function insightToHtml(md: string): string {
  return md
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(?!<[hul])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
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

function MiniDonut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  return (
    <svg viewBox="0 0 36 36" className="w-16 h-16">
      {data.filter((d) => d.value > 0).map((d) => {
        const pct = (d.value / total) * 100;
        const dash = `${pct} ${100 - pct}`;
        const el = (
          <circle key={d.label} cx="18" cy="18" r="14" fill="none" stroke={d.color} strokeWidth="4" strokeDasharray={dash} strokeDashoffset={-offset} />
        );
        offset += pct;
        return el;
      })}
      <text x="18" y="20" textAnchor="middle" className="fill-gray-600 dark:fill-gray-300" style={{ fontSize: 8, fontWeight: 600 }}>{total}</text>
    </svg>
  );
}

function StatCard({
  value,
  label,
  popover,
}: {
  value: string | number;
  label: string;
  popover?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="card p-4 text-center cursor-default hover:border-brand-500 transition-colors">
        <div className="text-2xl font-bold text-brand-600 dark:text-brand-500">{value}</div>
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

export default function WeeklyView({
  reports,
}: {
  reports: WeeklyReport[];
}) {
  const [idx, setIdx] = useState(0);
  const report = reports[idx];
  if (!report) return <p className="text-gray-500">暂无周报数据</p>;

  const activeCats = report.sections.filter((s) => s.items.length > 0).length;
  const donutData = report.categoryBreakdown
    .filter((c) => c.count > 0)
    .map((c) => ({ label: c.label, value: c.count, color: CATEGORY_COLORS[c.key] }));
  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  const dayLabels = report.dailyBreakdown.map((_, i) => weekdays[i] ?? "");

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
                (i === idx ? "bg-brand-500 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800")
              }
            >
              {i === 0 ? "本周" : r.weekLabel}
            </button>
          ))}
        </div>
      )}

      {/* Stats with popover cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          value={report.totalItems}
          label="本周资讯总量"
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
          value={activeCats}
          label="覆盖分类"
          popover={
            <div>
              <h4 className="text-xs font-semibold dark:text-gray-100 mb-3">分类占比分布</h4>
              <div className="flex items-center gap-4">
                <MiniDonut data={donutData} />
                <div className="space-y-1.5 flex-1">
                  {donutData.map((d) => {
                    const pct = report.totalItems > 0 ? Math.round((d.value / report.totalItems) * 100) : 0;
                    return (
                      <div key={d.label} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-gray-700 dark:text-gray-200 flex-1">{d.label}</span>
                        <span className="text-gray-400 tabular-nums">{d.value}</span>
                        <span className="text-gray-300 dark:text-gray-600 tabular-nums text-[10px] w-7 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* AI Weekly Summary */}
      {report.topSummary && (
        <div className="bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 rounded-xl px-5 py-4 mb-6">
          <h2 className="text-sm font-semibold text-brand-700 dark:text-brand-500 mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-brand-500 text-white grid place-items-center text-[10px] font-bold">AI</span>
            本周重点
          </h2>
          <p className="text-sm text-brand-800 dark:text-brand-400 leading-relaxed">{report.topSummary}</p>
        </div>
      )}

      {/* AI Weekly Insight Report */}
      {report.weeklyInsight && (
        <div className="card border-l-4 border-l-brand-500 px-5 py-4 mb-6">
          <h2 className="text-sm font-semibold dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center text-[10px] font-bold">AI</span>
            周度洞察报告
          </h2>
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed
              prose-h2:text-base prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-2
              prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5"
            dangerouslySetInnerHTML={{ __html: insightToHtml(report.weeklyInsight) }}
          />
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
          <ol className="space-y-3">
            {report.topItems.map((item, i) => (
              <li key={item.id} className="flex gap-3">
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

      {/* Category sections with AI summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {report.sections
          .filter((s) => s.items.length > 0)
          .map((sec) => (
            <section key={sec.key} className="card p-4">
              <h3 className="text-sm font-semibold dark:text-gray-100 mb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: CATEGORY_COLORS[sec.key] }} />
                {sec.label}
                <span className="text-xs text-gray-400 font-normal">{sec.items.length} 条</span>
              </h3>
              <ul className="space-y-2">
                {sec.items.map((item) => (
                  <li key={item.id}>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-gray-700 dark:text-gray-300 hover:text-brand-600 line-clamp-2 leading-snug">
                      {item.title}
                    </a>
                    {item.aiNote && (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{item.aiNote}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>

      {/* Source breakdown */}
      {report.topSources.length > 0 && (
        <section className="card p-4">
          <h3 className="text-sm font-semibold dark:text-gray-100 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-500 rounded-sm" />
            本周活跃来源
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.topSources.map((s) => (
              <span key={s.name} className="px-2.5 py-1 rounded-full text-xs border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                {s.name} <span className="text-gray-400">{s.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
