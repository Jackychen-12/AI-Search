"use client";

import { useLocale } from "./LocaleProvider";

/**
 * Inline translated text for server components: <T k="weekly.title" />.
 * Server pages stay static while individual strings follow the active locale.
 */
export default function T({ k }: { k: string }) {
  const { t } = useLocale();
  return <>{t(k)}</>;
}
