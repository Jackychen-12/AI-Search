import { XMLParser } from "fast-xml-parser";
import type { AIItem } from "../../lib/types";
import { getText, toIso, truncate } from "../lib/fetchUtil";
import type { SourceAdapter } from "./types";

const CATS = (process.env.ARXIV_CATS || "cs.AI,cs.CL,cs.LG")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);
const MAX = Number(process.env.ARXIV_MAX || 20);

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) return String((v as Record<string, unknown>)["#text"]);
  return "";
}

export const arxiv: SourceAdapter = {
  id: "arxiv",
  label: "arXiv (cs.AI/CL/LG)",
  tier: 1,
  async fetch(): Promise<AIItem[]> {
    const query = CATS.map((c) => `cat:${c}`).join("+OR+");
    const url = `https://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=${MAX}`;
    const xml = await getText(url, { Accept: "application/atom+xml" });
    const doc = parser.parse(xml);
    const entries = doc?.feed?.entry ?? [];
    const list = Array.isArray(entries) ? entries : [entries];

    const out: AIItem[] = [];
    for (const e of list) {
      const title = text(e.title).replace(/\s+/g, " ").trim();
      const absUrl = text(e.id).trim();
      if (!title || !absUrl) continue;
      out.push({
        id: `arxiv-${absUrl.split("/abs/")[1] ?? absUrl}`,
        title,
        summary: truncate(text(e.summary).replace(/\s+/g, " "), 200) || null,
        source: "arXiv",
        sourceUrl: absUrl,
        category: "paper",
        publishedAt: toIso(text(e.published)),
        tags: ["论文", "arXiv"],
        aiSelected: true,
        origin: "arxiv",
      });
    }
    return out;
  },
};
