// Minimal offline service worker for the static site. Derives the base path from
// its own location so it works under both "/" (dev) and "/AI-Search/" (Pages).
const CACHE = "ai-search-v5";
const BASE = self.location.pathname.replace(/sw\.js$/, "");
const MAX_PAGE_ENTRIES = 60; // cap navigations so the cache can't grow forever

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(BASE))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Drop the oldest page entries beyond the cap (static assets are exempt —
// they're immutable and replaced wholesale on version bump).
async function trimPages(cache) {
  const keys = await cache.keys();
  const pages = keys.filter((req) => {
    const p = new URL(req.url).pathname;
    return !p.includes("/_next/static/") && !/\.(svg|png|ico|woff2?)$/.test(p);
  });
  for (const req of pages.slice(0, Math.max(0, pages.length - MAX_PAGE_ENTRIES))) {
    await cache.delete(req);
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json")) return;

  // Immutable static assets -> cache-first.
  if (url.pathname.includes("/_next/static/") || /\.(svg|png|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Page navigations -> network-first, fall back to cache, then app shell.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy).then(() => trimPages(c)));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(BASE))),
    );
  }
});
