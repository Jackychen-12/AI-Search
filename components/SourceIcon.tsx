"use client";

import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Deterministic avatar palette — same source always gets the same color.
const PALETTE = [
  "#2453ee", "#e11d48", "#059669", "#d97706", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#dc2626", "#4f46e5",
];

function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Source favicon (served same-origin from public/favicons, fetched at build
 * time) with a colored letter-avatar fallback when the icon is missing.
 * Gives the feed and story timelines a visual fingerprint per source.
 */
export default function SourceIcon({
  url,
  source,
  size = 16,
}: {
  url: string;
  source: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const host = hostOf(url);

  if (failed || !host) {
    return (
      <span
        aria-hidden
        className="inline-grid place-items-center rounded-full text-white font-bold shrink-0 align-middle"
        style={{ width: size, height: size, fontSize: size * 0.55, backgroundColor: hashColor(source) }}
      >
        {source.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`${BASE}/favicons/${host}.png`}
      alt=""
      width={size}
      height={size}
      decoding="async"
      className="inline-block rounded-sm shrink-0 align-middle"
      onError={() => setFailed(true)}
    />
  );
}
