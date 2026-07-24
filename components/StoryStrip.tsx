"use client";

import Link from "next/link";
import type { StoryStatus } from "@/lib/stories";
import { useLocale } from "./LocaleProvider";

/** Trimmed story shape for the homepage strip (keeps the baked payload small). */
export interface StoryBrief {
  id: string;
  title: string;
  status: StoryStatus;
  sourceCount: number;
}

/**
 * Compact homepage strip: the top ongoing (developing/new) stories with their
 * corroboration count, linking to /stories for the full timelines.
 */
export default function StoryStrip({ stories }: { stories: StoryBrief[] }) {
  const { t } = useLocale();
  if (stories.length === 0) return null;

  return (
    <section className="card p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold dark:text-gray-100 flex items-center gap-2">
          <span className="w-1 h-4 bg-red-500 rounded-sm" />
          {t("stories.strip.title")}
        </h2>
        <Link href="/stories" className="text-xs text-gray-400 hover:text-brand-600 transition">
          {t("stories.strip.more")} →
        </Link>
      </div>
      <ul className="space-y-2.5">
        {stories.map((s) => (
          <li key={s.id} className="flex items-start gap-2 text-sm">
            <span
              className={
                "shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium " +
                (s.status === "developing"
                  ? "bg-red-500 text-white"
                  : "bg-brand-500 text-white")
              }
            >
              {t(`stories.status.${s.status}`)}
            </span>
            <Link href="/stories" className="min-w-0 flex-1 leading-snug text-gray-800 dark:text-gray-200 hover:text-brand-600 line-clamp-2">
              {s.title}
            </Link>
            <span className="shrink-0 text-[11px] text-brand-600 dark:text-brand-400 font-medium mt-0.5">
              {s.sourceCount} {t("stories.sources")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
