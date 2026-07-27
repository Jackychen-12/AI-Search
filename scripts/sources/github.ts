import type { AIItem } from "../../lib/types";
import { getJson, truncate } from "../lib/fetchUtil";
import type { SourceAdapter } from "./types";

interface GHRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  created_at: string;
  pushed_at: string;
  topics?: string[];
}
interface GHSearch {
  total_count: number;
  items: GHRepo[];
}

const TOPICS = (
  process.env.GITHUB_TOPICS ||
  "llm,ai-agent,generative-ai,rag,llmops,agents,diffusion-models,multimodal"
)
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

const DAYS = Number(process.env.CRAWL_DAYS || 30);
const PER_TOPIC = Number(process.env.GITHUB_PER_TOPIC || 10);

function sinceDate(): string {
  const d = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export const github: SourceAdapter = {
  id: "github",
  label: "GitHub Trending (new AI repos)",
  // Star-ranked community signal, not an editorial source.
  tier: 2,
  async fetch(): Promise<AIItem[]> {
    const since = sinceDate();
    const out: AIItem[] = [];
    const failed: string[] = [];
    for (const topic of TOPICS) {
      const q = encodeURIComponent(`topic:${topic} created:>${since}`);
      const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=${PER_TOPIC}`;
      // Search API rate limits are tight without a token — one throttled topic
      // must not sink the rest.
      let data: GHSearch;
      try {
        data = await getJson<GHSearch>(url, headers());
      } catch {
        failed.push(topic);
        continue;
      }
      for (const r of data.items || []) {
        out.push({
          id: `gh-${r.full_name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`,
          title: r.full_name,
          summary: r.description ? truncate(r.description, 160) : null,
          source: "GitHub",
          sourceUrl: r.html_url,
          category: "ai-products",
          publishedAt: r.created_at,
          tags: [...(r.topics || []).slice(0, 4), r.language].filter(Boolean) as string[],
          engagement: r.stargazers_count,
          aiSelected: true,
          origin: "github",
        });
      }
    }
    if (failed.length > 0) {
      console.log(`[github] ${failed.length}/${TOPICS.length} topic(s) failed: ${failed.join(", ")}`);
      // All topics down usually means auth/rate-limit trouble — surface it.
      if (out.length === 0) throw new Error(`all ${TOPICS.length} topics failed (rate limit?)`);
    }
    return out;
  },
};
