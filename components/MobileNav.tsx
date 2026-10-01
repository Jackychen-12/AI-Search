"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "./LocaleProvider";

const TABS = [
  { key: "/", icon: "home", i18n: "nav.home" },
  { key: "/daily", icon: "daily", i18n: "nav.daily" },
  { key: "/weekly", icon: "weekly", i18n: "nav.weekly" },
  { key: "/trends", icon: "trends", i18n: "nav.trends" },
  { key: "/github", icon: "github", i18n: "nav.githubShort" },
  { key: "/topics", icon: "topics", i18n: "nav.topics" },
] as const;

function Icon({ name, active }: { name: string; active: boolean }) {
  const cls = `w-5 h-5 ${active ? "text-brand-600 dark:text-brand-500" : "text-gray-400 dark:text-gray-500"}`;
  switch (name) {
    case "home":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12l9-8 9 8" /><path d="M5 10v10a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1V10" />
        </svg>
      );
    case "daily":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "weekly":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "trends":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "github":
      // Outline GitHub mark (stroke style, matching the other tab icons).
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      );
    case "topics":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const isActive = (key: string) => {
    if (key === "/") return pathname === "/" || pathname === "";
    return pathname.startsWith(key);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-bottom">
      <div className="flex items-center justify-around h-14">
        {TABS.map((tab) => {
          const active = isActive(tab.key);
          return (
            <Link
              key={tab.key}
              href={tab.key}
              className={
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors " +
                (active ? "text-brand-600 dark:text-brand-500" : "text-gray-400 dark:text-gray-500")
              }
            >
              <Icon name={tab.icon} active={active} />
              <span className="text-[10px] leading-none">{t(tab.i18n)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
