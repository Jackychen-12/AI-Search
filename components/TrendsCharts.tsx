"use client";

import { useState, useMemo, useEffect } from "react";
import { animate } from "framer-motion";
import LineChart from "./LineChart";
import type { DailyCount, TopicTrend } from "@/lib/trends";
import { CATEGORY_COLORS } from "@/lib/trends";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryKey } from "@/lib/types";

function AnimatedNum({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

const TOPIC_COLORS = ["#3b6cff", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444", "#84cc16"];

type Range = "7d" | "14d" | "30d" | "custom" | "all";

export default function TrendsCharts({
  daily,
  topics,
}: {
  daily: DailyCount[];
  topics: TopicTrend[];
}) {
  const [range, setRange] = useState<Range>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedCats, setSelectedCats] = useState<Set<CategoryKey>>(new Set(CATEGORIES.map((c) => c.key)));
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set(topics.slice(0, 6).map((t) => t.slug)));

  const dateRange = useMemo(() => {
    if (daily.length === 0) return { min: "", max: "" };
    return { min: daily[0].date, max: daily[daily.length - 1].date };
  }, [daily]);

  const sliced = useMemo(() => {
    if (range === "all") return daily;
    if (range === "custom" && customStart && customEnd) {
      return daily.filter((d) => d.date >= customStart && d.date <= customEnd);
    }
    const n = range === "7d" ? 7 : range === "14d" ? 14 : 30;
    return daily.slice(-n);
  }, [daily, range, customStart, customEnd]);

  const labels = sliced.map((d) => d.date);

  const totalSeries = [{ label: "每日新增", color: "#3b6cff", data: sliced.map((d) => d.total) }];

  const catSeries = CATEGORIES
    .filter((c) => selectedCats.has(c.key))
    .map((c) => ({
      label: c.label,
      color: CATEGORY_COLORS[c.key],
      data: sliced.map((d) => d.byCategory[c.key] ?? 0),
    }));

  const topicSeries = topics
    .filter((t) => selectedTopics.has(t.slug))
    .map((t, i) => ({
      label: t.name,
      color: TOPIC_COLORS[i % TOPIC_COLORS.length],
      data: labels.map((date) => t.counts.find((c) => c.date === date)?.count ?? 0),
    }));

  const totalItems = sliced.reduce((s, d) => s + d.total, 0);
  const avgDaily = sliced.length > 0 ? Math.round(totalItems / sliced.length) : 0;
  const peakDay = sliced.length > 0 ? sliced.reduce((max, d) => (d.total > max.total ? d : max), sliced[0]) : null;
  const topCat = CATEGORIES.reduce((best, c) => {
    const sum = sliced.reduce((s, d) => s + (d.byCategory[c.key] ?? 0), 0);
    return sum > best.sum ? { label: c.label, sum } : best;
  }, { label: "", sum: 0 });

  function toggleCat(key: CategoryKey) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  }

  function toggleTopic(slug: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const tab = (active: boolean) =>
    "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 " +
    (active ? "bg-brand-500 text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-brand-600");

  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
          {(["7d", "14d", "30d", "all"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={tab(range === r)}>
              {r === "all" ? "全部" : r === "7d" ? "7 天" : r === "14d" ? "14 天" : "30 天"}
            </button>
          ))}
          <button onClick={() => setRange("custom")} className={tab(range === "custom")}>
            自定义
          </button>
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition " +
            (showFilter
              ? "border-brand-500 bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-500"
              : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-brand-500")
          }
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            筛选
          </span>
        </button>
      </div>

      {/* Custom date range */}
      {range === "custom" && (
        <div className="card p-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">日期范围</span>
          <input
            type="date"
            value={customStart}
            min={dateRange.min}
            max={dateRange.max}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <span className="text-xs text-gray-400">至</span>
          <input
            type="date"
            value={customEnd}
            min={customStart || dateRange.min}
            max={dateRange.max}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <span className="text-[11px] text-gray-400">
            {customStart && customEnd
              ? `共 ${sliced.length} 天 · ${totalItems} 条`
              : "请选择起止日期"}
          </span>
        </div>
      )}

      {/* Filter panel */}
      {showFilter && (
        <div className="card p-4 space-y-4">
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">分类筛选（点击切换显隐）</h4>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = selectedCats.has(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() => toggleCat(c.key)}
                    className={
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition " +
                      (active
                        ? "border-current font-medium"
                        : "border-gray-200 dark:border-gray-600 text-gray-400 line-through")
                    }
                    style={active ? { color: CATEGORY_COLORS[c.key], borderColor: CATEGORY_COLORS[c.key] } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: active ? CATEGORY_COLORS[c.key] : "#d1d5db" }} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">话题筛选</h4>
            <div className="flex flex-wrap gap-2">
              {topics.map((t, i) => {
                const active = selectedTopics.has(t.slug);
                const color = TOPIC_COLORS[i % TOPIC_COLORS.length];
                return (
                  <button
                    key={t.slug}
                    onClick={() => toggleTopic(t.slug)}
                    className={
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition " +
                      (active
                        ? "border-current font-medium"
                        : "border-gray-200 dark:border-gray-600 text-gray-400 line-through")
                    }
                    style={active ? { color, borderColor: color } : {}}
                  >
                    {t.name}
                    <span className="text-gray-400 font-normal">{t.total}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-grid">
        <div className="card p-3.5 text-center">
          <div className="text-lg font-bold text-brand-600 dark:text-brand-500 tabular-nums"><AnimatedNum value={totalItems} /></div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">区间总量</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500">条资讯</div>
        </div>
        <div className="card p-3.5 text-center">
          <div className="text-lg font-bold text-brand-600 dark:text-brand-500 tabular-nums"><AnimatedNum value={avgDaily} /></div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">日均更新</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500">条/天</div>
        </div>
        <div className="card p-3.5 text-center">
          <div className="text-lg font-bold text-brand-600 dark:text-brand-500 tabular-nums">{peakDay ? peakDay.date.slice(5) : "-"}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">峰值日</div>
          {peakDay && <div className="text-[10px] text-gray-400 dark:text-gray-500">{peakDay.total} 条</div>}
        </div>
        <div className="card p-3.5 text-center">
          <div className="text-lg font-bold text-brand-600 dark:text-brand-500 tabular-nums">{topCat.label || "-"}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">最热分类</div>
          {topCat.sum > 0 && <div className="text-[10px] text-gray-400 dark:text-gray-500">{topCat.sum} 条</div>}
        </div>
      </div>

      {/* Chart 1: Daily total */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold dark:text-gray-100 mb-1 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-500 rounded-sm" />
          每日新增资讯量
        </h2>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4">鼠标悬浮查看每日具体数值</p>
        <LineChart labels={labels} series={totalSeries} height={200} />
      </section>

      {/* Chart 2: By category */}
      <section className="card p-5">
        <h2 className="text-sm font-semibold dark:text-gray-100 mb-1 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-500 rounded-sm" />
          分类趋势对比
        </h2>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">点击上方"筛选"可控制显示的分类</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
          {catSeries.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <LineChart labels={labels} series={catSeries} height={220} />
      </section>

      {/* Chart 3: Topic trends */}
      {topicSeries.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold dark:text-gray-100 mb-1 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-500 rounded-sm" />
            热门话题趋势
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">点击上方"筛选"可选择追踪的话题</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
            {topicSeries.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
          <LineChart labels={labels} series={topicSeries} height={220} />
        </section>
      )}

      {/* Topic ranking */}
      {topics.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-500 rounded-sm" />
            话题热度排名
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topics.map((t, i) => {
              const barWidth = topics[0].total > 0 ? (t.total / topics[0].total) * 100 : 0;
              return (
                <div key={t.slug} className="flex items-center gap-2.5 py-1.5">
                  <span
                    className={
                      "shrink-0 w-5 h-5 grid place-items-center rounded font-mono text-[10px] font-semibold " +
                      (i < 3 ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400")
                    }
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-0.5">
                      <span className="text-gray-700 dark:text-gray-200 truncate">{t.name}</span>
                      <span className="text-xs text-gray-400 tabular-nums shrink-0 ml-2">{t.total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${barWidth}%`, opacity: 0.7 + 0.3 * (1 - i / topics.length) }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
