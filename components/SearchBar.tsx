"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { OPEN_CMDK_EVENT } from "./CommandPalette";
import { useLocale } from "./LocaleProvider";
import { useViewState } from "@/lib/viewState";

const HISTORY_KEY = "ai-search-history";
const MAX_HISTORY = 6;
const HOT_WORDS = ["OpenAI", "Claude", "Agent", "Qwen", "GPT", "开源模型", "LLM", "Gemini"];

function getHistory(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(keyword: string) {
  const hist = getHistory().filter((h) => h !== keyword);
  hist.unshift(keyword);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, MAX_HISTORY)));
}

export default function SearchBar() {
  const { state, update } = useViewState();
  const { t } = useLocale();
  // On the GitHub trends page this box searches repos (the page's own search), not news.
  const onGithub = (usePathname() ?? "").startsWith("/github");

  /** Hand the query to the trends page: it keeps its state in the URL and re-reads it on popstate. */
  function searchRepos(keyword: string) {
    const sp = new URLSearchParams(window.location.search);
    if (keyword) sp.set("q", keyword);
    else sp.delete("q");
    const qs = sp.toString();
    window.history.pushState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    setValue("");
    setFocused(false);
  }
  const [value, setValue] = useState(state.keyword);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setValue(state.keyword), [state.keyword]);
  useEffect(() => setHistory(getHistory()), []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const keyword = value.trim();
    if (onGithub) return searchRepos(keyword);
    if (keyword) {
      saveHistory(keyword);
      setHistory(getHistory());
    }
    update({ keyword });
    setFocused(false);
  }

  function pick(word: string) {
    setValue(word);
    saveHistory(word);
    setHistory(getHistory());
    update({ keyword: word });
    setFocused(false);
  }

  // History and hot words are news searches — not offered on the repo page.
  const showDropdown = !onGithub && focused && !value.trim() && (history.length > 0 || HOT_WORDS.length > 0);

  return (
    <div ref={wrapRef} className="relative">
      <form onSubmit={submit}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={t(onGithub ? "gh.search.header" : "search.placeholder")}
          className="w-full h-9 pl-9 pr-12 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:bg-white dark:focus:bg-gray-700"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_CMDK_EVENT))}
          title="快速命令面板 (⌘K)"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] leading-none text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 hover:border-brand-400 hover:text-brand-500"
        >
          ⌘K
        </button>
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 py-2 overflow-hidden">
          {history.length > 0 && (
            <div className="px-3 pb-2">
              <div className="text-[10px] text-gray-400 mb-1.5">最近搜索</div>
              <div className="flex flex-wrap gap-1.5">
                {history.map((h) => (
                  <button
                    key={h}
                    onClick={() => pick(h)}
                    className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/20 transition"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="px-3 pt-1 border-t border-gray-100 dark:border-gray-700">
            <div className="text-[10px] text-gray-400 mb-1.5">热门搜索</div>
            <div className="flex flex-wrap gap-1.5">
              {HOT_WORDS.map((w) => (
                <button
                  key={w}
                  onClick={() => pick(w)}
                  className="px-2 py-1 text-xs rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/20 transition"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
