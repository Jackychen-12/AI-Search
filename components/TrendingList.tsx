"use client";

import { useState } from "react";
import type { AIItem } from "@/lib/types";

const COLLAPSED_COUNT = 5;

function trendReason(item: AIItem): string {
  if (item.aiNote) return item.aiNote;
  if (item.summary) {
    const s = item.summary.replace(/\s+/g, " ").trim();
    return s.length > 60 ? s.slice(0, 58) + "…" : s;
  }
  return "";
}

export default function TrendingList({
  items,
  trendSummary,
}: {
  items: AIItem[];
  trendSummary?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const hasMore = items.length > COLLAPSED_COUNT;

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">暂无数据</p>;
  }

  return (
    <>
      <ol className="space-y-1">
        {shown.map((item, idx) => (
          <li key={item.id}>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="group flex gap-2.5 -mx-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <span
                className={
                  "shrink-0 w-5 h-5 grid place-items-center rounded-md font-mono text-xs font-semibold " +
                  (idx < 3
                    ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-400")
                }
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-brand-600 line-clamp-2 leading-snug">
                  {item.title}
                </span>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5 truncate">
                  <span className="truncate">{item.source}</span>
                  {(item.engagement ?? 0) > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium shrink-0">
                      ·{" "}
                      {item.origin === "github"
                        ? `★ ${item.engagement!.toLocaleString()}`
                        : item.origin === "hackernews"
                          ? `HN ${item.engagement!.toLocaleString()} 赞`
                          : item.engagement!.toLocaleString()}
                    </span>
                  ) : typeof item.heat === "number" && item.heat > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium shrink-0">· 🔥 {item.heat}</span>
                  ) : null}
                </div>
                {trendReason(item) && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug line-clamp-2">
                    {trendReason(item)}
                  </p>
                )}
              </div>
            </a>
          </li>
        ))}
      </ol>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full text-center text-xs text-brand-600 dark:text-brand-500 hover:text-brand-700 py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition"
        >
          {expanded ? "收起" : `展开全部 ${items.length} 条`}
        </button>
      )}
      {trendSummary && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <span className="text-brand-600 dark:text-brand-500 font-medium">AI 总结 · </span>
          {trendSummary}
        </div>
      )}
    </>
  );
}
