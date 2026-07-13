import type { AIItem } from "../../lib/types";
import { getJson, hashId, stripHtml, truncate } from "../lib/fetchUtil";
import type { SourceAdapter } from "./types";

interface HNHit {
  objectID: string;
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  created_at: string | null;
  story_text?: string | null;
}
interface HNResponse {
  hits: HNHit[];
}

// Front-page-worthy AI stories from Hacker News via the public Algolia API.
const QUERIES = ["AI", "LLM", "GPT", "OpenAI", "Anthropic", "open source model"];
const MIN_POINTS = Number(process.env.HN_MIN_POINTS || 40);
const PER_QUERY = 20;

export const hackernews: SourceAdapter = {
  id: "hackernews",
  label: "Hacker News (AI stories)",
  tier: 2,
  async fetch(): Promise<AIItem[]> {
    const byId = new Map<string, AIItem>();
    for (const q of QUERIES) {
      const url =
        `https://hn.algolia.com/api/v1/search_by_date?tags=story` +
        `&query=${encodeURIComponent(q)}&hitsPerPage=${PER_QUERY}` +
        `&numericFilters=points>=${MIN_POINTS}`;
      let data: HNResponse;
      try {
        data = await getJson<HNResponse>(url);
      } catch {
        continue; // one bad query shouldn't drop the whole source
      }
      for (const h of data.hits || []) {
        if (!h.title) continue;
        const link = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
        if (byId.has(h.objectID)) continue;
        byId.set(h.objectID, {
          id: hashId("hn", h.objectID),
          title: h.title.trim(),
          summary: h.story_text ? truncate(stripHtml(h.story_text), 180) : null,
          source: "Hacker News",
          sourceUrl: link,
          category: "industry",
          publishedAt: h.created_at,
          tags: ["Hacker News"],
          heat: Number(h.points ?? 0),
          aiSelected: true,
          origin: "hackernews",
        });
      }
    }
    return [...byId.values()];
  },
};
