"use client";

import { useEffect, useState } from "react";
import type { AIItem } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { cleanText } from "@/lib/text";
import { useLocale } from "./LocaleProvider";

/**
 * Best-effort detection of near-white logo banners (common og:images) so the
 * hero can downgrade them to a compact, contained layout instead of a huge
 * glaring white block (especially harsh in dark mode).
 *
 * Uses an off-screen probe with crossOrigin so the displayed <img> is never
 * affected: hosts without CORS simply fail the probe and we keep the normal
 * cover layout.
 */
function useNearWhiteImage(url: string | undefined): boolean {
  const [nearWhite, setNearWhite] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.referrerPolicy = "no-referrer";
    probe.onload = () => {
      if (cancelled) return;
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(probe, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let white = 0;
        const total = size * size;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] >= 240 && data[i + 1] >= 240 && data[i + 2] >= 240) white++;
        }
        if (white / total > 0.6) setNearWhite(true);
      } catch {
        // Tainted canvas or decode issue — keep the normal layout.
      }
    };
    probe.src = url;
    return () => {
      cancelled = true;
      probe.onload = null;
    };
  }, [url]);

  return nearWhite;
}

export default function Hero({ item }: { item: AIItem }) {
  const [imgError, setImgError] = useState(false);
  const { t } = useLocale();
  const cat = item.category ? CATEGORY_MAP[item.category] : null;
  const intro = item.aiNote || cleanText(item.summary);
  const nearWhite = useNearWhiteImage(item.image && !imgError ? item.image : undefined);

  const badges = (
    <div className="absolute top-3 left-3 flex items-center gap-2">
      <span className="text-xs px-2 py-0.5 rounded bg-brand-600 text-white font-medium shadow">{t("hero.headline")}</span>
      {cat && (
        <span className="text-xs px-2 py-0.5 rounded bg-black/55 text-white backdrop-blur">{t(`cat.${item.category}`)}</span>
      )}
    </div>
  );

  const body = (
    <div className="p-5">
      <h2 className="text-lg sm:text-xl font-bold leading-snug text-gray-900 dark:text-gray-100 group-hover:text-brand-600 line-clamp-2">
        {item.title}
      </h2>
      {intro && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">{intro}</p>}
      <div className="mt-3 text-xs text-gray-400">{t("card.source")}：{item.source}</div>
    </div>
  );

  if (!item.image || imgError) {
    return (
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="card block overflow-hidden group mb-5"
      >
        <div className="relative h-32 bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <span className="text-white/80 text-4xl font-bold tracking-wider">AI</span>
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-white/20 text-white font-medium backdrop-blur">{t("hero.headline")}</span>
            {cat && (
              <span className="text-xs px-2 py-0.5 rounded bg-black/30 text-white backdrop-blur">{t(`cat.${item.category}`)}</span>
            )}
          </div>
        </div>
        {body}
      </a>
    );
  }

  // Near-white logo banner -> compact contained layout on a soft neutral panel.
  if (nearWhite) {
    return (
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="card block overflow-hidden group mb-5"
      >
        <div className="relative h-28 sm:h-32 bg-gray-50 dark:bg-gray-800/70 flex items-center justify-center px-6 py-4">
          <img
            src={item.image}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-h-full max-w-[70%] object-contain rounded dark:brightness-90"
            onError={() => setImgError(true)}
          />
          {badges}
        </div>
        {body}
      </a>
    );
  }

  return (
    <a
      href={item.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="card block overflow-hidden group mb-5"
    >
      <div className="relative h-48 sm:h-64">
        <img
          src={item.image}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover dark:brightness-90"
          onError={() => setImgError(true)}
        />
        {/* Soften harsh (often white) image bottoms into the card body. */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
        {badges}
      </div>
      {body}
    </a>
  );
}
