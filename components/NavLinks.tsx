"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";
import LocaleSwitch from "./LocaleSwitch";

export default function NavLinks() {
  const { t } = useLocale();

  return (
    <nav className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
      <Link href="/" className="hover:text-brand-600">{t("nav.home")}</Link>
      <Link href="/daily" className="hover:text-brand-600">{t("nav.daily")}</Link>
      <Link href="/stories" className="hover:text-brand-600">{t("nav.stories")}</Link>
      <Link href="/weekly" className="hover:text-brand-600">{t("nav.weekly")}</Link>
      <Link href="/trends" className="hover:text-brand-600">{t("nav.trends")}</Link>
      <a
        href="https://github.com/keyuchen-del/AI-Search"
        target="_blank"
        rel="noreferrer"
        className="hover:text-brand-600"
      >
        GitHub
      </a>
      <LocaleSwitch />
    </nav>
  );
}
