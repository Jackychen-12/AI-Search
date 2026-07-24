"use client";

import { useState } from "react";
import type { Story, StoryStatus } from "@/lib/stories";
import { formatRelative } from "@/lib/timeFormat";
import { useLocale } from "./LocaleProvider";

const STATUS_STYLE: Record<StoryStatus, string> = {
  developing: "bg-red-500 text-white",
  new: "bg-brand-500 text-white",
  settled: "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
};

const COLLAPSED_ITEMS = 4;

function StatusBadge({ status }: { status: StoryStatus }) {
  const { t } = useLocale();
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_STYLE[status]}`}>
      {status === "developing" && "🔥 "}
      {t(`stories.status.${status}`)}
    </span>
  );
}

function StoryCard({ story }: { story: Story }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? story.items : story.items.slice(-COLLAPSED_ITEMS);
  const hidden = story.items.length - items.length;

  return (
    <article className="card p-4 sm:p-5">
      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
        <StatusBadge status={story.status} />
        <span className="px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 font-medium">
          {story.sourceCount} {t("stories.sources")}
          {story.firstPartyCount > 0 && ` · ${story.firstPartyCount} ${t("stories.firstParty")}`}
        </span>
        {story.spanDays > 1 && (
          <span className="text-gray-400">{story.spanDays} {t("stories.days")}</span>
        )}
        <span className="text-gray-400 ml-auto shrink-0">
          {t("stories.updated")} {formatRelative(story.lastUpdate)}
        </span>
      </div>

      {/* Representative title links to the highest-heat coverage */}
      <h2 className="text-base font-semibold leading-snug dark:text-gray-100 mb-1.5">
        {story.title}
      </h2>
      <div className="text-xs text-gray-400 mb-3 truncate">{story.sources.join(" · ")}</div>

      {story.aiNote && (
        <p className="text-xs text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 rounded-md px-2 py-1.5 leading-relaxed mb-3">
          <span className="font-medium">AI · </span>
          {story.aiNote}
        </p>
      )}

      {/* Timeline */}
      <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-1.5 space-y-2.5">
        {hidden > 0 && (
          <li className="pl-4">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs text-gray-400 hover:text-brand-600 transition"
            >
              ⋯ {t("stories.expand")} (+{hidden})
            </button>
          </li>
        )}
        {items.map((it) => (
          <li key={it.id} className="pl-4 relative">
            <span className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 rounded-full bg-brand-400" />
            <div className="flex items-baseline gap-2 text-xs">
              <span className="font-mono text-gray-400 shrink-0">{it.time.slice(5, 10)}</span>
              <a
                href={it.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 text-sm text-gray-800 dark:text-gray-200 hover:text-brand-600 leading-snug"
              >
                {it.title}
              </a>
            </div>
            <div className="pl-12 text-[11px] text-gray-400">
              {it.source}
              {it.heat > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400">♨ {it.heat.toLocaleString()}</span>}
            </div>
          </li>
        ))}
        {expanded && story.items.length > COLLAPSED_ITEMS && (
          <li className="pl-4">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-gray-400 hover:text-brand-600 transition"
            >
              {t("stories.collapse")}
            </button>
          </li>
        )}
      </ol>
    </article>
  );
}

export default function StoriesView({ stories }: { stories: Story[] }) {
  const { t } = useLocale();
  if (stories.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t("stories.empty")}</p>;
  }
  return (
    <div className="space-y-4">
      {stories.map((s) => (
        <StoryCard key={s.id} story={s} />
      ))}
      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center pt-2">{t("stories.note")}</p>
    </div>
  );
}
