"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";

const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

/**
 * Polls version.json and, when a newer build is live, shows a small refresh
 * toast instead of force-reloading — never interrupt someone mid-read.
 */
export default function AutoUpdate() {
  const { t } = useLocale();
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const url = `${base}/version.json`;
    let initial: number | null = null;

    async function check() {
      try {
        const res = await fetch(`${url}?_=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const v = data.v as number;
        if (initial === null) {
          initial = v;
          return;
        }
        if (v > initial) setHasUpdate(true);
      } catch {}
    }

    check();
    const timer = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  if (!hasUpdate) return null;

  return (
    <button
      type="button"
      onClick={() => location.reload()}
      className="fixed bottom-36 md:bottom-24 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-brand-600 text-white text-xs font-medium shadow-lg hover:bg-brand-700 transition"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
      </svg>
      {t("update.available")}
    </button>
  );
}
