"use client";

import { useMemo, useState } from "react";
import type { Story, StoryStatus } from "@/lib/stories";
import { ENTITY_MAP } from "@/lib/entities";
import { formatRelative } from "@/lib/timeFormat";
import { useLocale } from "./LocaleProvider";

const STATUS_STYLE: Record<StoryStatus, string> = {
  developing: "bg-red-500 text-white",
  new: "bg-brand-500 text-white",
  settled: "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
};

const DOT_STYLE: Record<StoryStatus, string> = {
  developing: "bg-red-500",
  new: "bg-brand-500",
  settled: "bg-gray-300 dark:bg-gray-600",
};

const FOCUS_COUNT = 2;
const FOCUS_TIMELINE_ITEMS = 4;

function StatusBadge({ status }: { status: StoryStatus }) {
  const { t } = useLocale();
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_STYLE[status]}`}>
      {status === "developing" && "🔥 "}
      {t(`stories.status.${status}`)}
    </span>
  );
}

function Timeline({ story, limit }: { story: Story; limit?: number }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const items = !limit || expanded ? story.items : story.items.slice(-limit);
  const hidden = story.items.length - items.length;

  return (
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
    </ol>
  );
}

/** Rich card for the few stories that deserve the spotlight. */
function FocusCard({ story }: { story: Story }) {
  const { t } = useLocale();
  return (
    <article className="card p-4 sm:p-5 border-l-[3px] border-l-red-500">
      <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
        <StatusBadge status={story.status} />
        <span className="px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 font-medium">
          {story.sourceCount} {t("stories.sources")}
          {story.firstPartyCount > 0 && ` · ${story.firstPartyCount} ${t("stories.firstParty")}`}
        </span>
        {story.spanDays > 1 && <span className="text-gray-400">{story.spanDays} {t("stories.days")}</span>}
        <span className="text-gray-400 ml-auto shrink-0">
          {t("stories.updated")} {formatRelative(story.lastUpdate)}
        </span>
      </div>
      <h3 className="text-base font-semibold leading-snug dark:text-gray-100 mb-1.5">{story.title}</h3>
      <div className="text-xs text-gray-400 mb-3 truncate">{story.sources.join(" · ")}</div>
      {story.aiNote && (
        <p className="text-xs text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 rounded-md px-2 py-1.5 leading-relaxed mb-3">
          <span className="font-medium">AI · </span>
          {story.aiNote}
        </p>
      )}
      <Timeline story={story} limit={FOCUS_TIMELINE_ITEMS} />
    </article>
  );
}

/** One-line collapsed row; click to reveal the full timeline inline. */
function CompactRow({ story }: { story: Story }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
      >
        <span className={`shrink-0 w-2 h-2 rounded-full ${DOT_STYLE[story.status]}`} title={t(`stories.status.${story.status}`)} />
        <span className={"min-w-0 flex-1 text-sm leading-snug dark:text-gray-200 " + (open ? "" : "truncate")}>
          {story.title}
        </span>
        <span className="shrink-0 text-[11px] text-brand-600 dark:text-brand-400 font-medium">
          {story.sourceCount} {t("stories.sources")}
        </span>
        <span className="shrink-0 hidden sm:inline text-[11px] text-gray-400 w-16 text-right">
          {formatRelative(story.lastUpdate)}
        </span>
        <span className={`shrink-0 text-gray-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-2 flex-wrap text-xs mb-2 mt-1.5">
            <StatusBadge status={story.status} />
            {story.firstPartyCount > 0 && (
              <span className="text-brand-600 dark:text-brand-400">{story.firstPartyCount} {t("stories.firstParty")}</span>
            )}
            {story.spanDays > 1 && <span className="text-gray-400">{story.spanDays} {t("stories.days")}</span>}
            <span className="text-gray-400 truncate">{story.sources.join(" · ")}</span>
          </div>
          {story.aiNote && (
            <p className="text-xs text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 rounded-md px-2 py-1.5 leading-relaxed mb-2.5">
              <span className="font-medium">AI · </span>
              {story.aiNote}
            </p>
          )}
          <Timeline story={story} />
        </div>
      )}
    </div>
  );
}

export default function StoriesView({ stories }: { stories: Story[] }) {
  const { t } = useLocale();
  const [status, setStatus] = useState<StoryStatus | "all">("all");
  const [entity, setEntity] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: stories.length, developing: 0, new: 0, settled: 0 };
    for (const s of stories) c[s.status]++;
    return c;
  }, [stories]);

  // Topic chips from the entities present in the current status slice.
  const entityChips = useMemo(() => {
    const pool = status === "all" ? stories : stories.filter((s) => s.status === status);
    const c = new Map<string, number>();
    for (const s of pool) for (const e of s.entities) c.set(e, (c.get(e) ?? 0) + 1);
    return [...c.entries()]
      .filter(([slug]) => ENTITY_MAP[slug])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [stories, status]);

  const filtered = useMemo(
    () =>
      stories.filter(
        (s) => (status === "all" || s.status === status) && (!entity || s.entities.includes(entity)),
      ),
    [stories, status, entity],
  );

  // Spotlight the hottest active stories — only in the unfiltered view, so
  // filters always show a plain, complete list.
  const noFilter = status === "all" && !entity;
  const focus = noFilter
    ? [...filtered]
        .filter((s) => s.status !== "settled")
        .sort((a, b) => b.sourceCount - a.sourceCount || b.heat - a.heat)
        .slice(0, FOCUS_COUNT)
    : [];
  const focusIds = new Set(focus.map((s) => s.id));
  const rest = filtered.filter((s) => !focusIds.has(s.id));

  if (stories.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t("stories.empty")}</p>;
  }

  const tabs: { key: StoryStatus | "all"; label: string }[] = [
    { key: "all", label: t("stories.filter.all") },
    { key: "developing", label: `🔥 ${t("stories.status.developing")}` },
    { key: "new", label: t("stories.status.new") },
    { key: "settled", label: t("stories.status.settled") },
  ];

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map(
            (tab) =>
              (statusCounts[tab.key] ?? 0) > 0 && (
                <button
                  key={tab.key}
                  onClick={() => setStatus(tab.key)}
                  className={
                    "px-3 py-1.5 rounded-md text-xs font-medium transition " +
                    (status === tab.key
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700")
                  }
                >
                  {tab.label}
                  <span className="ml-1 opacity-60">({statusCounts[tab.key]})</span>
                </button>
              ),
          )}
        </div>
        {entityChips.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {entityChips.map(([slug, count]) => (
              <button
                key={slug}
                onClick={() => setEntity(entity === slug ? null : slug)}
                className={
                  "px-2.5 py-1 rounded-full text-[11px] border transition " +
                  (entity === slug
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400"
                    : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand-500 hover:text-brand-600")
                }
              >
                {ENTITY_MAP[slug].name}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Focus stories — full cards with visible timelines */}
      {focus.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold dark:text-gray-100 flex items-center gap-2">
            <span className="w-1 h-4 bg-red-500 rounded-sm" />
            {t("stories.focus")}
          </h2>
          {focus.map((s) => (
            <FocusCard key={s.id} story={s} />
          ))}
        </section>
      )}

      {/* Everything else — compact expandable rows */}
      {rest.length > 0 && (
        <section className="space-y-2">
          {focus.length > 0 && (
            <h2 className="text-sm font-semibold dark:text-gray-100 flex items-center gap-2">
              <span className="w-1 h-4 bg-brand-500 rounded-sm" />
              {t("stories.list")}
              <span className="text-xs text-gray-400 font-normal">{rest.length}</span>
            </h2>
          )}
          {rest.map((s) => (
            <CompactRow key={s.id} story={s} />
          ))}
        </section>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">{t("stories.filter.empty")}</p>
      )}

      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center pt-2">{t("stories.note")}</p>
    </div>
  );
}
