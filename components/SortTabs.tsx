"use client";

import { useLocale } from "./LocaleProvider";
import { useViewState } from "@/lib/viewState";
import type { Mode } from "@/lib/types";

export default function SortTabs() {
  const { t } = useLocale();
  const { state, update } = useViewState();

  const modeOpts: { key: Mode; label: string }[] = [
    { key: "selected", label: t("cat.selected") },
    { key: "all", label: t("cat.everything") },
  ];

  const sinceOpts: { key: string; label: string }[] = [
    { key: "24h", label: t("time.24h") },
    { key: "3d", label: t("time.3d") },
    { key: "7d", label: t("time.7d") },
    { key: "30d", label: t("time.30d") },
  ];

  return (
    <div className="flex items-center mb-3 flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
          {modeOpts.map((o) => (
            <button
              key={o.key}
              onClick={() => update({ mode: o.key })}
              className={
                "px-3 h-7 inline-flex items-center rounded-full transition-all duration-200 text-[13px] font-medium " +
                (state.mode === o.key
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-brand-600")
              }
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
          {sinceOpts.map((o) => (
            <button
              key={o.key}
              onClick={() => update({ since: o.key })}
              className={
                "px-3 h-7 inline-flex items-center rounded-full transition-all duration-200 text-[13px] font-medium " +
                (state.since === o.key
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-brand-600")
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
