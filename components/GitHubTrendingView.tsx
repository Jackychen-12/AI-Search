"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "./LocaleProvider";
import GitHubMark, { ForkIcon, StarIcon } from "./GitHubMark";
import {
  GH_FUN_KINDS,
  GH_NEW_DAYS,
  GH_TRACKS,
  GH_TRACK_MAP,
  ghAgeDays,
  ghStreak,
  type GhPeriod,
  type GhRepo,
  type GhSource,
  type GhTrack,
  type GhTrendingSnapshot,
} from "@/lib/ghTrending";
import { formatBJDate, formatBJTime } from "@/lib/timeFormat";

type TrackFilter = GhTrack | "all";

/** 38088 -> "38.1k", 1293 -> "1,293" */
function fmt(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}k`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("en-US");
}

/** Per-day pace for each window we know (missing = not on that list / unknown). */
function pace(r: GhRepo) {
  return {
    d: r.gained.daily,
    w: r.gained.weekly !== undefined ? r.gained.weekly / 7 : undefined,
    m: r.gained.monthly !== undefined ? r.gained.monthly / 30 : undefined,
  };
}

function momentum(r: GhRepo): "up" | "down" | null {
  const { d, w } = pace(r);
  if (d === undefined || w === undefined || w < 20) return null;
  if (d > w * 1.5) return "up";
  if (d < w * 0.6) return "down";
  return null;
}

/** Repo descriptions often carry emoji — strip them so the page stays typographically calm. */
const plain = (text: string) => text.replace(/\p{Extended_Pictographic}\uFE0F?/gu, "").replace(/\s{2,}/g, " ").trim();

/** Hotness across windows — for lists that aren't tied to one period (fun column). */
const score = (r: GhRepo) => (r.gained.weekly ?? 0) + (r.gained.daily ?? 0) * 3 + (r.gained.monthly ?? 0) / 4;

/** Best window to quote for a repo outside the period ranking. */
function bestGain(r: GhRepo): { period: GhPeriod; n: number } | null {
  for (const p of ["weekly", "daily", "monthly"] as GhPeriod[]) {
    const n = r.gained[p];
    if (n !== undefined) return { period: p, n };
  }
  return null;
}

// --- small pieces -----------------------------------------------------------

function Avatar({ owner, className }: { owner: string; className: string }) {
  return (
    <img
      src={`https://avatars.githubusercontent.com/${owner}?s=96`}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className={"shrink-0 border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 " + className}
    />
  );
}

function TrackPill({ track }: { track: GhTrack }) {
  const { locale } = useLocale();
  const def = GH_TRACK_MAP[track];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 text-[11px] whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: def.color }} />
      {locale === "zh" ? def.zh : def.en}
    </span>
  );
}

function Badges({ r, now, fresh }: { r: GhRepo; now: number; fresh: boolean }) {
  const { t } = useLocale();
  const age = ghAgeDays(r.createdAt, now);
  const mo = momentum(r);
  return (
    <>
      {fresh && <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[11px] font-medium">NEW</span>}
      {age !== null && age <= GH_NEW_DAYS && (
        <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium whitespace-nowrap">
          {t("gh.new")} · {age}
          {t("gh.days")}
        </span>
      )}
      {mo === "up" && (
        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-medium whitespace-nowrap">
          ↑ {t("gh.accel")}
        </span>
      )}
      {mo === "down" && (
        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[11px] whitespace-nowrap">
          ↓ {t("gh.decel")}
        </span>
      )}
    </>
  );
}

function PaceBars({ r }: { r: GhRepo }) {
  const { t } = useLocale();
  const p = pace(r);
  const bars = [
    { k: "d", label: t("gh.pace.d"), v: p.d },
    { k: "w", label: t("gh.pace.w"), v: p.w },
    { k: "m", label: t("gh.pace.m"), v: p.m },
  ];
  const max = Math.max(1, ...bars.map((b) => b.v ?? 0));
  return (
    <div className="flex items-end gap-1" title={t("gh.pace")}>
      {bars.map((b) => (
        <div key={b.k} className="flex flex-col items-center gap-1 w-7">
          <div className="w-full h-7 flex items-end">
            <div
              className={
                "w-full rounded-sm " +
                (b.v === undefined ? "bg-gray-100 dark:bg-gray-800" : b.k === "d" ? "bg-brand-500" : "bg-brand-100 dark:bg-brand-700/50")
              }
              style={{ height: b.v === undefined ? 2 : `${Math.max(8, (b.v / max) * 100)}%` }}
              title={b.v === undefined ? "–" : `${b.label} ${Math.round(b.v).toLocaleString()} / day`}
            />
          </div>
          <span className="text-[9px] leading-none text-gray-400">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Star-history sparkline — appears once the daily crawl has ≥ 2 samples. */
function Sparkline({ r }: { r: GhRepo }) {
  if (r.history.length < 2) return null;
  const ys = r.history.map((h) => h.stars);
  const min = Math.min(...ys);
  const span = Math.max(1, Math.max(...ys) - min);
  const pts = ys.map((y, i) => `${(i / (ys.length - 1)) * 80},${22 - ((y - min) / span) * 20}`).join(" ");
  return (
    <svg viewBox="0 0 80 24" className="w-20 h-6 text-brand-500" aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Paper link + related site news ("why is it hot"). Nothing when neither exists. */
function Related({ r }: { r: GhRepo }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  if (!r.paper && r.news.length === 0) return null;
  const news = open ? r.news : r.news.slice(0, 1);
  return (
    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
      {r.paper && (
        <a href={r.paper.url} target="_blank" rel="noreferrer" className="flex gap-1 min-w-0 hover:text-brand-600">
          <span className="shrink-0 text-brand-600 dark:text-brand-500 font-medium">{t("gh.paper")} ·</span>
          <span className="truncate">{r.paper.title}</span>
        </a>
      )}
      {news.map((n, i) => (
        <div key={n.id} className="flex gap-1 min-w-0 items-baseline">
          <span className={"shrink-0 font-medium " + (i === 0 ? "text-brand-600 dark:text-brand-500" : "invisible")}>{t("gh.news")} ·</span>
          <a href={n.url} target="_blank" rel="noreferrer" className="truncate hover:text-brand-600">
            {n.title}
          </a>
          <span className="shrink-0 text-gray-400">· {n.source}</span>
          {i === 0 && r.news.length > 1 && !open && (
            <button onClick={() => setOpen(true)} className="shrink-0 text-brand-600 dark:text-brand-500 hover:underline">
              +{r.news.length - 1}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function Meta({ r, now }: { r: GhRepo; now: number }) {
  const { t } = useLocale();
  const age = ghAgeDays(r.createdAt, now);
  const streak = ghStreak(r.history);
  return (
    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-gray-500 dark:text-gray-400">
      {r.language && (
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.languageColor ?? "#9ca3af" }} />
          {r.language}
        </span>
      )}
      <span className="inline-flex items-center gap-1" title={r.stars.toLocaleString()}>
        <StarIcon className="w-3.5 h-3.5" />
        {fmt(r.stars)}
      </span>
      <span className="inline-flex items-center gap-1" title={r.forks.toLocaleString()}>
        <ForkIcon className="w-3.5 h-3.5" />
        {fmt(r.forks)}
      </span>
      {streak >= 2 && (
        <span>
          {t("gh.streak")} {streak}
          {t("gh.days")}
        </span>
      )}
      {r.createdAt && (age ?? 0) > GH_NEW_DAYS && (
        <span className="hidden sm:inline">
          {t("gh.created")} {r.createdAt.slice(0, 7)}
        </span>
      )}
    </div>
  );
}

/** Chinese take when we have one, else the (English) description. */
function Blurb({ r, lines }: { r: GhRepo; lines: 1 | 2 }) {
  const text = plain(r.aiNote || r.description || "");
  if (!text) return null;
  return (
    <p
      title={r.aiNote ? (r.description ?? undefined) : undefined}
      className={"text-[13px] leading-relaxed text-gray-600 dark:text-gray-400 " + (lines === 1 ? "line-clamp-1" : "line-clamp-2")}
    >
      {text}
    </p>
  );
}

// --- leaderboard ------------------------------------------------------------

function FeaturedCard({ r, rank, period, now, fresh }: { r: GhRepo; rank: number; period: GhPeriod; now: number; fresh: boolean }) {
  const { t } = useLocale();
  const [owner, name] = r.fullName.split("/");
  const gained = r.gained[period] ?? 0;
  return (
    <li className="card p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="w-6 h-6 grid place-items-center rounded-md font-mono text-xs font-semibold bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          {rank}
        </span>
        <TrackPill track={r.track} />
      </div>
      <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 min-w-0 group">
        <Avatar owner={owner} className="w-11 h-11 rounded-xl" />
        <div className="min-w-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{owner}</div>
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 truncate">{name}</div>
        </div>
      </a>
      <div className="min-h-[2.75rem]">
        <Blurb r={r} lines={2} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tabular-nums text-brand-600 dark:text-brand-500 leading-none" title={gained.toLocaleString()}>
            +{fmt(gained)}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            {t(`gh.period.${period}`)}
            {t("gh.gained")}
          </div>
        </div>
        <PaceBars r={r} />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badges r={r} now={now} fresh={fresh} />
      </div>
      <Related r={r} />
      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
        <Meta r={r} now={now} />
        <Sparkline r={r} />
      </div>
    </li>
  );
}

function ListRow({ r, rank, period, now, fresh }: { r: GhRepo; rank: number; period: GhPeriod; now: number; fresh: boolean }) {
  const { t } = useLocale();
  const [owner, name] = r.fullName.split("/");
  const gained = r.gained[period] ?? 0;
  return (
    <li className="flex gap-3 px-4 py-3.5 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
      <span className="shrink-0 w-6 h-6 grid place-items-center rounded-md bg-gray-100 dark:bg-gray-700 font-mono text-xs font-semibold text-gray-400 tabular-nums">
        {rank}
      </span>
      <Avatar owner={owner} className="hidden sm:block w-9 h-9 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="mr-1 text-[15px] leading-snug text-gray-900 dark:text-gray-100 hover:text-brand-600 [overflow-wrap:anywhere]"
          >
            <span className="text-gray-500 dark:text-gray-400">{owner} / </span>
            <span className="font-semibold">{name}</span>
          </a>
          <TrackPill track={r.track} />
          <Badges r={r} now={now} fresh={fresh} />
        </div>
        <Blurb r={r} lines={1} />
        <Related r={r} />
        <Meta r={r} now={now} />
      </div>
      <div className="shrink-0 text-right">
        <div className="text-base font-bold tabular-nums text-brand-600 dark:text-brand-500 leading-none" title={gained.toLocaleString()}>
          +{fmt(gained)}
        </div>
        <div className="mt-1 text-[11px] text-gray-400">
          {t(`gh.period.${period}`)}
          {t("gh.gained")}
        </div>
      </div>
    </li>
  );
}

// --- fun column (sidebar) -----------------------------------------------------

function FunRow({ r, period }: { r: GhRepo; period: GhPeriod }) {
  const { t, locale } = useLocale();
  const kind = GH_FUN_KINDS[r.fun!];
  const [owner] = r.fullName.split("/");
  const n = r.gained[period];
  const g = n !== undefined ? { period, n } : bestGain(r);
  const blurb = plain(r.aiNote || r.description || "");
  return (
    <li>
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        className="group flex gap-2.5 -mx-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
      >
        <Avatar owner={owner} className="w-5 h-5 mt-0.5 rounded-md" />
        <div className="min-w-0 flex-1">
          <span className="block text-sm text-gray-700 dark:text-gray-200 group-hover:text-brand-600 truncate">{r.fullName}</span>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5 truncate">
            <span>{locale === "zh" ? kind.zh : kind.en}</span>
            {g && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                · +{fmt(g.n)} {t(`gh.period.${g.period}`)}
              </span>
            )}
          </div>
          {blurb && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug line-clamp-1">{blurb}</p>}
        </div>
      </a>
    </li>
  );
}

/** Same "expand / collapse" control as the home sidebar lists. */
function MoreButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full text-center text-xs text-brand-600 dark:text-brand-500 hover:text-brand-700 py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition"
    >
      {children}
    </button>
  );
}

function SideCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold dark:text-gray-100 mb-1 flex items-center gap-2">
        <span className="w-1 h-4 bg-brand-500 rounded-sm" />
        {title}
      </h3>
      {desc ? <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">{desc}</p> : <div className="mb-2" />}
      {children}
    </div>
  );
}

/** Leaderboard rows shown before "expand all". */
const BOARD_LIMIT = 20;

/**
 * Fun column picks: repos moving in the selected period first (so the numbers
 * read like the rest of the page), one per kind for variety, then fill by heat.
 */
function pickFun(list: GhRepo[], period: GhPeriod, n = 6): GhRepo[] {
  const rank = (r: GhRepo) => (r.gained[period] !== undefined ? 1e9 + (r.gained[period] ?? 0) : score(r));
  const sorted = [...list].sort((a, b) => rank(b) - rank(a));
  const seen = new Set<string>();
  const firstOfKind = sorted.filter((r) => !seen.has(r.fun!) && seen.add(r.fun!));
  return [...firstOfKind, ...sorted.filter((r) => !firstOfKind.includes(r))].slice(0, n);
}

const pill = (active: boolean) =>
  "px-3 h-7 inline-flex items-center rounded-full transition-all duration-200 text-[13px] font-medium " +
  (active ? "bg-brand-500 text-white shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-brand-600");

// --- page -------------------------------------------------------------------

export default function GitHubTrendingView({ snapshot }: { snapshot: GhTrendingSnapshot | null }) {
  const { t, locale } = useLocale();
  const [period, setPeriod] = useState<GhPeriod>("weekly");
  const [track, setTrack] = useState<TrackFilter>("all");
  const [onlyNew, setOnlyNew] = useState(false);
  // "有趣玩法" is a filter like "只看新项目" (combinable with any track), not a track.
  const [onlyFun, setOnlyFun] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [track, period, onlyNew, onlyFun]);

  const repos = useMemo(() => snapshot?.repos ?? [], [snapshot]);
  // Snapshot time, not Date.now(): identical on server and client (no hydration drift).
  const now = snapshot ? Date.parse(snapshot.fetchedAt) : 0;
  const today = snapshot ? formatBJDate(snapshot.fetchedAt) : "";
  const firstDay = snapshot ? formatBJDate(snapshot.startedAt) === today : true;
  const isFresh = (r: GhRepo) => !firstDay && formatBJDate(r.firstSeen) === today;

  const inPeriod = useMemo(
    () =>
      repos
        .filter((r) => r.gained[period] !== undefined)
        .filter((r) => !onlyNew || (ghAgeDays(r.createdAt, now) ?? Infinity) <= GH_NEW_DAYS)
        .sort((a, b) => (b.gained[period] ?? 0) - (a.gained[period] ?? 0)),
    [repos, period, onlyNew, now],
  );
  const matches = (r: GhRepo) =>
    (track === "all" || r.track === track) &&
    (!onlyFun || !!r.fun) &&
    (!onlyNew || (ghAgeDays(r.createdAt, now) ?? Infinity) <= GH_NEW_DAYS);
  const visible = inPeriod.filter(matches);

  const trackStats = useMemo(() => {
    const stats = GH_TRACKS.map((d) => {
      const rs = inPeriod.filter((r) => r.track === d.key);
      return { def: d, count: rs.length, gained: rs.reduce((s, r) => s + (r.gained[period] ?? 0), 0) };
    });
    return { stats, total: stats.reduce((s, x) => s + x.gained, 0) };
  }, [inPeriod, period]);

  const funAll = useMemo(() => repos.filter((r) => r.fun), [repos]);

  const breakouts = useMemo(
    () =>
      repos
        .filter((r) => r.gained.daily !== undefined && r.sources.includes("trending"))
        .map((r) => {
          const w = r.gained.weekly !== undefined ? r.gained.weekly / 7 : undefined;
          return { r, isNew: w === undefined, ratio: w ? (r.gained.daily ?? 0) / w : Infinity };
        })
        .filter((x) => x.isNew || x.ratio >= 1.8)
        .sort((a, b) => (b.r.gained.daily ?? 0) - (a.r.gained.daily ?? 0)),
    [repos],
  );

  if (!snapshot || repos.length === 0) {
    return <main className="max-w-7xl mx-auto px-4 py-10 text-sm text-gray-500">{t("gh.noData")}</main>;
  }

  const trackName = (k: GhTrack) => (locale === "zh" ? GH_TRACK_MAP[k].zh : GH_TRACK_MAP[k].en);
  const periodLabel = t(`gh.period.${period}`);
  const share = (n: number) => (trackStats.total > 0 ? Math.round((n / trackStats.total) * 100) : 0);
  const ranked = [...trackStats.stats].sort((a, b) => b.gained - a.gained);
  const hottest = ranked[0]?.gained > 0 ? ranked[0] : null;
  const second = ranked[1]?.gained > 0 ? ranked[1] : null;
  const leader = inPeriod[0];
  const bySource = (s: GhSource) => repos.filter((r) => r.sources.includes(s)).length;
  const strong = "text-gray-800 dark:text-gray-200 font-medium";

  // One line of narrative; counts live in the stats, momentum in the sidebar.
  const insight =
    locale === "zh" ? (
      <>
        {hottest && (
          <>
            <span className={strong}>{hottest.def.zh}</span>（{share(hottest.gained)}%）
            {second && (
              <>
                与 <span className={strong}>{second.def.zh}</span>（{share(second.gained)}%）
              </>
            )}
            贡献了最多新增 Star
          </>
        )}
        {leader && (
          <>
            {hottest ? "，" : ""}
            <span className={strong}>{leader.fullName}</span> 以 +{fmt(leader.gained[period] ?? 0)} 领跑
          </>
        )}
        。
      </>
    ) : (
      <>
        {hottest && (
          <>
            <span className={strong}>{hottest.def.en}</span> ({share(hottest.gained)}%)
            {second && (
              <>
                {" "}and <span className={strong}>{second.def.en}</span> ({share(second.gained)}%)
              </>
            )}{" "}
            drew the most new stars
          </>
        )}
        {leader && (
          <>
            {hottest ? "; " : ""}
            <span className={strong}>{leader.fullName}</span> leads with +{fmt(leader.gained[period] ?? 0)}
          </>
        )}
        .
      </>
    );

  const base = onlyFun ? inPeriod.filter((r) => r.fun) : inPeriod;
  const tabs: { key: TrackFilter; label: string; count: number }[] = [
    { key: "all", label: t("gh.all"), count: base.length },
    ...GH_TRACKS.map((d) => ({ key: d.key, label: trackName(d.key), count: base.filter((r) => r.track === d.key).length })),
  ];
  const note =
    track !== "all" ? (locale === "zh" ? GH_TRACK_MAP[track].descZh : GH_TRACK_MAP[track].descEn) : onlyFun ? t("gh.fun.desc") : "";

  const stats: { value: string; label: string; sub?: string }[] = [
    { value: String(inPeriod.length), label: locale === "zh" ? `${periodLabel}上榜` : `Trending ${periodLabel.toLowerCase()}` },
    { value: `+${fmt(trackStats.total)}`, label: `${periodLabel}${t("gh.stat.stars")}` },
    {
      value: String(repos.length),
      label: t("gh.stat.repos"),
      sub: `Trending ${bySource("trending")} · ${t("gh.paper")} ${bySource("paper")} · ${t("gh.discovered")} ${bySource("discover")}`,
    },
  ];

  const top = visible.slice(0, 3);
  const shown = new Set(top.map((r) => r.fullName));
  const breakoutsShown = breakouts.filter((b) => !shown.has(b.r.fullName)).slice(0, 5);
  breakoutsShown.forEach((b) => shown.add(b.r.fullName));
  const funShown = pickFun(funAll.filter((r) => !shown.has(r.fullName)), period);
  const rest = visible.slice(3, expanded ? undefined : BOARD_LIMIT);
  const showBoard = () => document.getElementById("gh-board")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <section className="min-w-0 space-y-5">
          {/* Track tabs — underline tabs like the home category bar, scoped to the content column */}
          <div className="flex items-center gap-1 overflow-x-auto scroll-hide border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const active = track === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTrack(tab.key)}
                  className={
                    "shrink-0 -mb-px px-3 h-11 flex items-center gap-1.5 text-sm border-b-2 transition-colors duration-150 " +
                    (active
                      ? "border-brand-500 text-brand-600 dark:text-brand-500 font-medium"
                      : "border-transparent text-gray-600 dark:text-gray-300 hover:text-brand-600")
                  }
                >
                  {tab.label}
                  <span className="text-[11px] text-gray-400 font-normal tabular-nums">{tab.count}</span>
                </button>
              );
            })}
          </div>

          {/* Page header — overview, only on the "全部" tab */}
          {track === "all" && (
          <div className="card p-5 sm:p-6 bg-gradient-to-br from-brand-50/80 via-transparent to-transparent dark:from-brand-500/10">
            <div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold dark:text-gray-100 flex items-center gap-2">
                  <GitHubMark className="w-6 h-6" />
                  {t("gh.title")}
                </h1>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  {locale === "zh"
                    ? "汇总 GitHub Trending、HuggingFace 热门论文代码与世界模型新项目"
                    : "GitHub Trending, trending HuggingFace paper code and new world-model repos"}
                  <span className="mx-1.5">·</span>
                  {t("gh.updated")} {today} {formatBJTime(snapshot.fetchedAt)}
                </p>
              </div>
            </div>

            <dl className="mt-5 flex divide-x divide-gray-200/70 dark:divide-gray-700">
              {stats.map((s) => (
                <div key={s.label} className="min-w-0 px-4 sm:px-6 first:pl-0">
                  <dd className="text-xl sm:text-2xl font-bold tabular-nums text-brand-600 dark:text-brand-500">{s.value}</dd>
                  <dt className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.label}</dt>
                  {s.sub && <dd className="hidden sm:block text-[11px] text-gray-400 dark:text-gray-500">{s.sub}</dd>}
                </div>
              ))}
            </dl>

            {(hottest || leader) && (
              <p className="mt-5 pt-4 border-t border-gray-200/70 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                <span className="text-brand-600 dark:text-brand-500 font-medium">{t("gh.insight")} · </span>
                {insight}
              </p>
            )}
          </div>
          )}

          {/* Leaderboard */}
          <div id="gh-board" className="scroll-mt-4">
            {/* Row 1 — like the home SortTabs: rounded pill groups */}
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  {(["daily", "weekly", "monthly"] as GhPeriod[]).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)} className={pill(period === p)}>
                      {t(`gh.period.${p}`)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <button onClick={() => setOnlyNew((v) => !v)} className={pill(onlyNew)} aria-pressed={onlyNew}>
                    {t("gh.onlyNew")}
                  </button>
                  <button onClick={() => setOnlyFun((v) => !v)} className={pill(onlyFun)} aria-pressed={onlyFun}>
                    {t("gh.fun.tab")}
                  </button>
                </div>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t("feed.showing")} <span className="text-gray-800 dark:text-gray-200 font-medium">{visible.length}</span>
                {locale === "zh" ? " 个" : ""}
              </span>
            </div>

            {note && <p className="-mt-1 mb-4 text-xs text-gray-400 dark:text-gray-500">{note}</p>}

            {visible.length === 0 ? (
              <div className="card p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>{t("gh.empty")}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {(["daily", "weekly", "monthly"] as GhPeriod[])
                    .filter((p) => p !== period)
                    .map((p) => ({ p, n: repos.filter((r) => r.gained[p] !== undefined && matches(r)).length }))
                    .filter((x) => x.n > 0)
                    .map(({ p, n }) => (
                      <button key={p} onClick={() => setPeriod(p)} className="px-3 h-7 rounded-full text-[13px] font-medium bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-500 hover:bg-brand-100">
                        {t(`gh.period.${p}`)} · {n}
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <>
                <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {top.map((r, i) => (
                    <FeaturedCard key={r.fullName} r={r} rank={i + 1} period={period} now={now} fresh={isFresh(r)} />
                  ))}
                </ol>
                {rest.length > 0 && (
                  <ol start={4} className="card mt-3 divide-y divide-gray-100 dark:divide-gray-700/70 overflow-hidden">
                    {rest.map((r, i) => (
                      <ListRow key={r.fullName} r={r} rank={i + 4} period={period} now={now} fresh={isFresh(r)} />
                    ))}
                  </ol>
                )}
                {visible.length > BOARD_LIMIT && (
                  <MoreButton
                    onClick={() => {
                      if (expanded) showBoard();
                      setExpanded((v) => !v);
                    }}
                  >
                    {expanded ? t("gh.collapse") : `${t("gh.expand")} ${visible.length} ${locale === "zh" ? "个" : ""}`}
                  </MoreButton>
                )}
              </>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <SideCard title={t("gh.trackHeat")} desc={`${periodLabel} · ${t("gh.trackHeat.desc")}`}>
            <ul className="space-y-2.5">
              {ranked
                .filter((s) => s.count > 0)
                .map((s) => (
                  <li key={s.def.key}>
                    <button onClick={() => setTrack(s.def.key)} className="w-full text-left group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200 group-hover:text-brand-600">
                          <span className="w-2 h-2 rounded-full" style={{ background: s.def.color }} />
                          {trackName(s.def.key)}
                        </span>
                        <span className="tabular-nums text-gray-500 dark:text-gray-400">
                          +{fmt(s.gained)} · {s.count}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, share(s.gained))}%`, background: s.def.color }} />
                      </div>
                    </button>
                  </li>
                ))}
            </ul>
          </SideCard>

          {breakoutsShown.length > 0 && (
            <SideCard title={t("gh.breakout")} desc={t("gh.breakout.desc")}>
              <ol className="space-y-1">
                {breakoutsShown.map(({ r, isNew, ratio }, idx) => (
                  <li key={r.fullName}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex gap-2.5 -mx-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <span
                        className={
                          "shrink-0 w-5 h-5 grid place-items-center rounded-md font-mono text-xs font-semibold " +
                          (idx < 3 ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-400")
                        }
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm text-gray-700 dark:text-gray-200 group-hover:text-brand-600 truncate">{r.fullName}</span>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5 truncate">
                          <span>{trackName(r.track)}</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            · +{fmt(r.gained.daily ?? 0)} {t("gh.period.daily")}
                          </span>
                          <span>· {isNew ? t("gh.breakout.new") : `${ratio.toFixed(1)}× ${t("gh.pace.w")}`}</span>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ol>
            </SideCard>
          )}

          {funShown.length > 0 && (
            <SideCard title={t("gh.fun")} desc={t("gh.fun.desc")}>
              <ol className="space-y-1">
                {funShown.map((r) => (
                  <FunRow key={r.fullName} r={r} period={period} />
                ))}
              </ol>
              <MoreButton
                onClick={() => {
                  setTrack("all");
                  setOnlyFun(true);
                  showBoard();
                }}
              >
                {t("gh.viewAll")}
              </MoreButton>
            </SideCard>
          )}

        </aside>
      </main>
    </>
  );
}
