import type { MetadataRoute } from "next";
import { abs } from "@/lib/seo";
import { listDailyDates } from "@/lib/dailyData";
import { readArchive } from "@/lib/archive";
import { readLocalItems } from "@/lib/localStore";
import { ENTITIES, entityCounts } from "@/lib/entities";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pool = (() => {
    const a = readArchive();
    return a.length ? a : readLocalItems();
  })();
  const counts = entityCounts(pool);
  const topics = ENTITIES.filter((e) => (counts[e.slug] ?? 0) >= 5).map((e) => ({
    url: abs(`/topic/${e.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  const dailies = listDailyDates().map((d) => ({
    url: abs(`/daily/${d}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [
    { url: abs("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: abs("/daily"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: abs("/stories"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: abs("/about"), changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    ...topics,
    ...dailies,
  ];
}
