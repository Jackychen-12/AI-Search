"use client";

import { useState } from "react";
import { useLocale } from "./LocaleProvider";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * Copy a build-time share poster (PNG) to the clipboard; falls back to
 * downloading the file when the Clipboard API is unavailable. Hides itself
 * when the poster wasn't generated (e.g. story outside the top-N).
 */
export default function SharePoster({ poster }: { poster: string }) {
  const { t } = useLocale();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "hidden">("idle");
  if (state === "hidden") return null;

  const url = `${BASE}/posters/${poster}`;

  async function share() {
    if (state === "busy") return;
    setState("busy");
    try {
      const res = await fetch(url);
      if (!res.ok) {
        setState("hidden"); // poster not generated for this entry
        return;
      }
      const blob = await res.blob();
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setState("ok");
        setTimeout(() => setState("idle"), 2000);
        return;
      }
      throw new Error("clipboard unavailable");
    } catch {
      // Fallback: download the poster instead.
      const a = document.createElement("a");
      a.href = url;
      a.download = poster;
      a.click();
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand-500 hover:text-brand-600 transition"
      title={t("share.poster")}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M12 4v12M7 9l5-5 5 5" />
      </svg>
      {state === "ok" ? t("share.copied") : t("share.poster")}
    </button>
  );
}
