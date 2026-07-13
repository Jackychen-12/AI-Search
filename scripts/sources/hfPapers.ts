import type { AIItem } from "../../lib/types";
import { getJson, truncate } from "../lib/fetchUtil";
import type { SourceAdapter } from "./types";

interface HFPaper {
  paper?: {
    id?: string;
    upvotes?: number;
    title?: string;
    summary?: string;
  };
  title?: string;
  summary?: string;
  publishedAt?: string;
  numComments?: number;
}

const ENDPOINT = "https://huggingface.co/api/daily_papers";

export const hfPapers: SourceAdapter = {
  id: "hf-papers",
  label: "HuggingFace Daily Papers",
  tier: 1,
  async fetch(): Promise<AIItem[]> {
    const data = await getJson<HFPaper[]>(ENDPOINT);
    if (!Array.isArray(data)) return [];
    const out: AIItem[] = [];
    for (const row of data) {
      const arxivId = row.paper?.id;
      const title = row.title || row.paper?.title;
      if (!arxivId || !title) continue;
      const summary = row.summary || row.paper?.summary || "";
      out.push({
        id: `hf-${arxivId}`,
        title: title.trim(),
        summary: summary ? truncate(summary, 200) : null,
        source: "HuggingFace Papers",
        sourceUrl: `https://huggingface.co/papers/${arxivId}`,
        category: "paper",
        publishedAt: row.publishedAt ?? null,
        tags: ["论文", "arXiv"],
        heat: Number(row.paper?.upvotes ?? row.numComments ?? 0),
        aiSelected: true,
        origin: "hf-papers",
      });
    }
    return out;
  },
};
