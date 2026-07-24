"use client";

import { useEffect, useRef } from "react";

// All three come from env so forks never point comments at someone else's repo.
const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO || "";
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID || "";
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || "";

export default function Comments() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!REPO || !REPO_ID || !CATEGORY_ID || !ref.current) return;
    if (ref.current.querySelector("iframe")) return;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", REPO);
    script.setAttribute("data-repo-id", REPO_ID);
    script.setAttribute("data-category", "Announcements");
    script.setAttribute("data-category-id", CATEGORY_ID);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-lang", "zh-CN");
    script.setAttribute("data-loading", "lazy");

    const isDark = document.documentElement.classList.contains("dark");
    script.setAttribute("data-theme", isDark ? "dark" : "light");

    script.crossOrigin = "anonymous";
    script.async = true;
    ref.current.appendChild(script);
  }, []);

  if (!REPO || !REPO_ID || !CATEGORY_ID) return null;

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold dark:text-gray-100 mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-brand-500 rounded-sm" />
        评论与讨论
      </h3>
      <div ref={ref} />
    </div>
  );
}
