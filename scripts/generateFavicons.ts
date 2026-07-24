/**
 * Fetch source favicons at build time into public/favicons/{host}.png so the
 * static site can serve them same-origin (fast + reachable everywhere, no
 * third-party favicon service at runtime). Failures are silent — the UI falls
 * back to a colored letter avatar per source.
 */
import fs from "node:fs";
import path from "node:path";

const DATA_PATH = path.resolve("data/items.json");
const OUT_DIR = path.resolve("public/favicons");
const TIMEOUT_MS = 6000;
const SIZE = 64;

interface Item {
  source: string;
  sourceUrl: string;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

async function fetchFavicon(host: string): Promise<Buffer | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${SIZE}`,
      { signal: ctrl.signal },
    );
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  let items: Item[] = [];
  try {
    items = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch {
    console.log("[favicons] no snapshot yet — skipping");
    return;
  }

  // Most frequent hostname per host (covers redirects/mirrors per source).
  const hosts = new Set<string>();
  for (const it of items) {
    const h = hostOf(it.sourceUrl);
    if (h) hosts.add(h);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0;
  let skipped = 0;
  const list = [...hosts];
  const CONCURRENCY = 8;
  let i = 0;
  async function worker() {
    for (;;) {
      const host = list[i++];
      if (!host) return;
      const file = path.join(OUT_DIR, `${host}.png`);
      if (fs.existsSync(file)) {
        skipped++;
        continue;
      }
      const buf = await fetchFavicon(host);
      if (buf) {
        fs.writeFileSync(file, buf);
        ok++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`[favicons] ${ok} fetched, ${skipped} cached, ${hosts.size} hosts total`);
}

main().catch((e) => {
  console.error("[favicons] failed:", e.message);
  process.exit(0); // never block the build on favicons
});
