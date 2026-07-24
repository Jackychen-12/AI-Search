"use client";

import { memo } from "react";
import Link from "next/link";
import type { AIItem, Digest } from "@/lib/types";
import type { StoreMeta } from "@/lib/localStore";
import type { ViewState } from "@/lib/viewState";
import { buildHref } from "@/lib/href";
import { formatBJDate } from "@/lib/timeFormat";
import TrendingList from "./TrendingList";
import SourceFilter from "./SourceFilter";
import { useLocale } from "./LocaleProvider";

export default memo(function Sidebar({
  trending,
  meta,
  state,
  sources,
  topics,
  trendSummary,
  digest,
}: {
  trending: AIItem[];
  meta?: StoreMeta | null;
  state: ViewState;
  sources: [string, number][];
  topics?: { slug: string; name: string; count: number }[];
  trendSummary?: string | null;
  digest?: Digest | null;
}) {
  const { t } = useLocale();
  const top = trending.slice(0, 10);
  const failed = meta ? Object.keys(meta.errors ?? {}).length : 0;
  const topSources = sources.slice(0, 14);

  const sourceHref = (name: string) =>
    buildHref({
      category: state.category,
      mode: state.mode,
      since: state.since,
      keyword: state.keyword,
      source: state.source === name ? undefined : name,
    });

  return (
    <aside className="space-y-4">
      {/* 热门榜单 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold dark:text-gray-100 mb-1 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-500 rounded-sm" />
          {t("sidebar.trending")}
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">{t("sidebar.trending.desc")}</p>
        <TrendingList items={top} trendSummary={trendSummary} />
      </div>

      {/* 数据来源（可点筛选） */}
      {sources.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold dark:text-gray-100 mb-1 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-500 rounded-sm" />
            {t("sidebar.sources")}
          </h3>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-2.5">
            {meta?.fetchedAt && <>{t("footer.updated")} {formatBJDate(meta.fetchedAt)} · </>}
            {sources.length} {t("sidebar.sources.count")}
            {failed > 0 && <span className="text-amber-500"> · {failed} {t("sidebar.sources.notUpdated")}</span>}
            <span className="text-gray-400"> · {t("sidebar.sources.filter")}</span>
          </div>
          <SourceFilter
            sources={topSources}
            activeSources={state.source ? state.source.split(",") : []}
          />
        </div>
      )}

      {/* AI 每日必读（原主栏大卡并入侧边栏，替代推荐阅读） */}
      {digest && digest.picks.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold dark:text-gray-100 mb-1 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-500 rounded-sm" />
            {t("topreads.title")}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">{t("topreads.desc")}</p>
          <ol className="space-y-2.5">
            {digest.picks.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug">
                <span className="shrink-0 w-[18px] h-[18px] grid place-items-center rounded bg-brand-500 text-white text-[10px] font-mono mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <a
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-700 dark:text-gray-200 hover:text-brand-600"
                  >
                    {p.title}
                  </a>
                  {p.reason && (
                    <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5 leading-relaxed line-clamp-2">{p.reason}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 热门话题 */}
      {topics && topics.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold dark:text-gray-100 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-1 h-4 bg-brand-500 rounded-sm" />
              {t("sidebar.topics")}
            </span>
            <Link href="/topics" className="text-[11px] text-brand-600 dark:text-brand-500 font-normal hover:underline">{t("sidebar.viewall")}</Link>
          </h3>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <Link
                key={t.slug}
                href={`/topic/${t.slug}`}
                className="px-2.5 py-1 rounded-full text-xs border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-brand-500 hover:text-brand-600 transition"
              >
                {t.name}
                <span className="ml-1 text-gray-400">{t.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </aside>
  );
})
