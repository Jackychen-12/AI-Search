"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";
import LocaleSwitch from "./LocaleSwitch";
import GitHubMark from "./GitHubMark";

export default function NavLinks() {
  const { t } = useLocale();

  return (
    <nav className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
      <Link href="/" className="hover:text-brand-600">{t("nav.home")}</Link>
      <Link href="/daily" className="hover:text-brand-600">{t("nav.daily")}</Link>
      <Link href="/stories" className="hover:text-brand-600">{t("nav.stories")}</Link>
      <Link href="/weekly" className="hover:text-brand-600">{t("nav.weekly")}</Link>
      <Link href="/trends" className="hover:text-brand-600">{t("nav.trends")}</Link>
      <Link href="/github" className="hover:text-brand-600">{t("nav.github")}</Link>
      <LocaleSwitch />
      <a
        href="https://github.com/Jackychen-12/AI-Search"
        target="_blank"
        rel="noreferrer"
        aria-label={t("nav.repo")}
        title={t("nav.repo")}
        className="text-gray-500 dark:text-gray-400 hover:text-brand-600"
      >
        <GitHubMark className="w-[18px] h-[18px]" />
      </a>
    </nav>
  );
}
