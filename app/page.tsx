import HomeClient from "@/components/HomeClient";
import { readDigest, readLocalItems, readStoreMeta } from "@/lib/localStore";
import { normalizeItems } from "@/lib/classify";
import { MOCK_ITEMS } from "@/lib/mockData";
import { readArchive } from "@/lib/archive";
import { buildStories } from "@/lib/stories";
import { SITE_DESC, SITE_NAME, SITE_URL, jsonLdScript } from "@/lib/seo";

// Static export: the snapshot is read at build time and baked into the page;
// all filtering/search/pagination then happens client-side in the browser.
export default function Home() {
  const raw = readLocalItems();
  const items = normalizeItems(raw.length > 0 ? raw : MOCK_ITEMS);
  const meta = readStoreMeta();
  // Computed once at build and serialized into props (stable across SSR + client,
  // so NEW/今日新增 windows don't cause hydration mismatch).
  const now = meta?.fetchedAt ? new Date(meta.fetchedAt).getTime() : Date.now();

  // Top ongoing cross-source stories for the homepage strip (trimmed payload).
  const stories = buildStories([...raw, ...readArchive()], now)
    .filter((s) => s.status !== "settled")
    .slice(0, 3)
    .map((s) => ({ id: s.id, title: s.title, status: s.status, sourceCount: s.sourceCount }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: SITE_NAME, url: SITE_URL, description: SITE_DESC, inLanguage: "zh-CN" },
      {
        "@type": "ItemList",
        itemListElement: items.slice(0, 20).map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: it.sourceUrl,
          name: it.title,
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <HomeClient items={items} meta={meta} now={now} digest={readDigest()} stories={stories} />
    </>
  );
}
