import { XMLParser } from "fast-xml-parser";
import type { AIItem, CategoryKey } from "../../lib/types";
import { isAiRelated } from "../lib/aiFilter";
import { getText, hashId, stripHtml, toIso, truncate } from "../lib/fetchUtil";
import type { SourceAdapter } from "./types";

interface FeedDef {
  id: string;
  label: string;
  url: string;
  source: string;
  /** Fallback category before the classifier runs over the merged set. */
  category: CategoryKey;
  /** General-purpose feed: keep only AI-related items. */
  aiOnly?: boolean;
  /** Source credibility tier: 1 = first-party, 2 = authoritative media, 3 = aggregator. */
  tier: 1 | 2 | 3;
}

// Reputable, public RSS/Atom feeds spanning Chinese + English AI coverage:
// model labs, research blogs, the tech press, and community. Each is fetched
// independently — a single dead feed never sinks the crawl.
const FEEDS: FeedDef[] = [
  // ══ Tier 1 — 一手官方 / 模型实验室 / 研究机构 ══
  { id: "rss:openai", label: "OpenAI News", url: "https://openai.com/news/rss.xml", source: "OpenAI", category: "ai-models", tier: 1 },
  { id: "rss:anthropic", label: "Anthropic Blog", url: "https://www.anthropic.com/rss.xml", source: "Anthropic", category: "ai-models", tier: 1 },
  { id: "rss:google-ai", label: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", source: "Google AI", category: "ai-models", tier: 1 },
  { id: "rss:deepmind", label: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", source: "Google DeepMind", category: "ai-models", tier: 1 },
  { id: "rss:meta-ai", label: "Meta AI Blog", url: "https://ai.meta.com/blog/rss/", source: "Meta AI", category: "ai-models", tier: 1 },
  { id: "rss:nvidia", label: "NVIDIA Blog", url: "https://blogs.nvidia.com/feed/", source: "NVIDIA", category: "ai-models", aiOnly: true, tier: 1 },
  { id: "rss:hf-blog", label: "HuggingFace Blog", url: "https://huggingface.co/blog/feed.xml", source: "HuggingFace Blog", category: "tip", tier: 1 },
  { id: "rss:mistral", label: "Mistral AI Blog", url: "https://mistral.ai/feed.xml", source: "Mistral AI", category: "ai-models", tier: 1 },
  { id: "rss:cohere", label: "Cohere Blog", url: "https://cohere.com/blog/rss.xml", source: "Cohere", category: "ai-models", tier: 1 },
  { id: "rss:stability", label: "Stability AI Blog", url: "https://stability.ai/blog/rss.xml", source: "Stability AI", category: "ai-models", tier: 1 },
  { id: "rss:bair", label: "BAIR Blog", url: "https://bair.berkeley.edu/blog/feed.xml", source: "Berkeley AI Research", category: "paper", tier: 1 },
  { id: "rss:mit-news-ai", label: "MIT News AI", url: "https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml", source: "MIT News", category: "industry", tier: 1 },
  { id: "rss:msr", label: "Microsoft Research", url: "https://www.microsoft.com/en-us/research/feed/", source: "Microsoft Research", category: "paper", aiOnly: true, tier: 1 },
  { id: "rss:aws-ml", label: "AWS ML Blog", url: "https://aws.amazon.com/blogs/machine-learning/feed/", source: "AWS ML", category: "tip", tier: 1 },

  // ══ Tier 2 — 权威科技媒体 ══
  { id: "rss:theverge-ai", label: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "The Verge", category: "industry", tier: 2 },
  { id: "rss:techcrunch-ai", label: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch", category: "industry", tier: 2 },
  { id: "rss:venturebeat-ai", label: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", source: "VentureBeat", category: "industry", tier: 2 },
  { id: "rss:arstechnica-ai", label: "Ars Technica AI", url: "https://arstechnica.com/ai/feed/", source: "Ars Technica", category: "industry", tier: 2 },
  { id: "rss:techreview-ai", label: "MIT Tech Review AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", source: "MIT Tech Review", category: "industry", tier: 2 },
  { id: "rss:wired-ai", label: "Wired AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", source: "Wired", category: "industry", tier: 2 },
  { id: "rss:theinformation", label: "The Information", url: "https://www.theinformation.com/feed", source: "The Information", category: "industry", aiOnly: true, tier: 2 },
  { id: "rss:a16z-ai", label: "a16z AI Blog", url: "https://a16z.com/category/ai/feed/", source: "a16z", category: "tip", aiOnly: true, tier: 2 },

  // ══ Tier 2 — 社区 / 个人博主（高质量原创）══
  { id: "rss:simonwillison", label: "Simon Willison", url: "https://simonwillison.net/atom/everything/", source: "Simon Willison", category: "tip", aiOnly: true, tier: 2 },
  { id: "rss:lilianweng", label: "Lil'Log", url: "https://lilianweng.github.io/index.xml", source: "Lilian Weng", category: "tip", tier: 2 },
  { id: "rss:raschka", label: "Ahead of AI", url: "https://magazine.sebastianraschka.com/feed", source: "Sebastian Raschka", category: "tip", tier: 2 },
  { id: "rss:thegradient", label: "The Gradient", url: "https://thegradient.pub/rss/", source: "The Gradient", category: "tip", aiOnly: true, tier: 2 },
  { id: "rss:importai", label: "Import AI", url: "https://importai.substack.com/feed", source: "Import AI", category: "tip", tier: 2 },
  { id: "rss:thebatch", label: "The Batch", url: "https://www.deeplearning.ai/the-batch/feed/", source: "The Batch", category: "tip", tier: 2 },
  { id: "rss:bensbites", label: "Ben's Bites", url: "https://bensbites.beehiiv.com/feed", source: "Ben's Bites", category: "tip", tier: 2 },

  // ══ Tier 3 — 中文聚合 / 转载媒体 ══
  { id: "rss:qbitai", label: "量子位", url: "https://www.qbitai.com/feed", source: "量子位", category: "ai-products", tier: 3 },
  { id: "rss:36kr", label: "36氪", url: "https://36kr.com/feed", source: "36氪", category: "industry", aiOnly: true, tier: 3 },
  { id: "rss:infoq", label: "InfoQ", url: "https://www.infoq.cn/feed", source: "InfoQ", category: "industry", aiOnly: true, tier: 3 },
  { id: "rss:sspai", label: "少数派", url: "https://sspai.com/feed", source: "少数派", category: "ai-products", aiOnly: true, tier: 3 },
  { id: "rss:ithome", label: "IT之家", url: "https://www.ithome.com/rss/", source: "IT之家", category: "industry", aiOnly: true, tier: 3 },
  { id: "rss:jiqizhixin", label: "机器之心", url: "https://www.jiqizhixin.com/rss", source: "机器之心", category: "ai-products", tier: 3 },
  { id: "rss:xinzhiyuan", label: "新智元", url: "https://feed.ainews.nbai.cn/", source: "新智元", category: "industry", tier: 3 },
  { id: "rss:paperweekly", label: "PaperWeekly", url: "https://www.paperweekly.site/rss", source: "PaperWeekly", category: "paper", tier: 3 },
];

const MAX_PER_FEED = Number(process.env.RSS_MAX_PER_FEED || 20);

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("#text" in o) return String(o["#text"]);
    if ("@_href" in o) return String(o["@_href"]);
  }
  return "";
}

/** Atom <link> can be an array of rel-typed links; prefer rel="alternate". */
function atomLink(v: unknown): string {
  if (Array.isArray(v)) {
    const alt = v.find((l) => (l as Record<string, unknown>)?.["@_rel"] === "alternate");
    return text(alt ?? v[0]);
  }
  return text(v);
}

function cleanSummary(raw: string): string | null {
  const s = stripHtml(raw);
  if (!s || s.includes("点击查看原文")) return null;
  return truncate(s, 180);
}

function normUrl(u: string | null): string | null {
  if (!u) return null;
  const s = u.trim();
  if (s.startsWith("//")) return "https:" + s;
  return /^https?:\/\//i.test(s) ? s : null;
}

function pickUrl(v: unknown): string | null {
  if (!v) return null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const u = pickUrl(x);
      if (u) return u;
    }
    return null;
  }
  if (typeof v === "string") return normUrl(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return normUrl((o["@_url"] as string) || (o["@_href"] as string) || (o["url"] as string) || "");
  }
  return null;
}

function imgFromHtml(html: unknown): string | null {
  if (!html) return null;
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? normUrl(m[1]) : null;
}

const BLOCKED_IMG_DOMAINS = ["img.36krcdn.com", "static.36kr.com", "static.geekpark.net"];

function isBlockedImage(url: string): boolean {
  try { return BLOCKED_IMG_DOMAINS.some((d) => new URL(url).hostname === d); } catch { return false; }
}

/** Best-effort cover image from common RSS/Atom media fields (no extra requests). */
function extractImage(it: Record<string, unknown>): string | null {
  const enc = it.enclosure as Record<string, unknown> | undefined;
  if (enc) {
    const type = String((enc["@_type"] as string) || "");
    if (!type || type.startsWith("image")) {
      const u = pickUrl(enc);
      if (u) return u;
    }
  }
  const group = it["media:group"] as Record<string, unknown> | undefined;
  const raw =
    pickUrl(it["media:content"]) ||
    pickUrl(it["media:thumbnail"]) ||
    pickUrl(group?.["media:content"]) ||
    pickUrl(it.image) ||
    imgFromHtml(it["content:encoded"]) ||
    imgFromHtml(it.description) ||
    imgFromHtml(it.content) ||
    null;
  if (raw && isBlockedImage(raw)) return null;
  return raw;
}

async function fetchFeed(feed: FeedDef): Promise<AIItem[]> {
  const xml = await getText(feed.url, { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" });
  const doc = parser.parse(xml);
  const rawItems = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.["rdf:RDF"]?.item ?? [];
  const list = Array.isArray(rawItems) ? rawItems : [rawItems];

  const out: AIItem[] = [];
  for (const it of list.slice(0, MAX_PER_FEED)) {
    const title = text(it.title).trim();
    const link = (atomLink(it.link) || text(it.guid) || text(it.id)).trim();
    if (!title || !link) continue;
    const summary =
      cleanSummary(
        text(it.description) ||
          text(it["content:encoded"]) ||
          text(it.summary) ||
          text(it.content),
      ) ?? "";
    if (feed.aiOnly && !isAiRelated(title, summary)) continue;
    out.push({
      id: hashId(feed.id, link),
      title,
      summary: summary || null,
      source: feed.source,
      sourceUrl: link,
      category: feed.category,
      publishedAt: toIso(text(it.pubDate) || text(it.published) || text(it.updated) || text(it["dc:date"])),
      image: extractImage(it),
      aiSelected: true,
      origin: feed.id,
    });
  }
  return out;
}

export const rssAdapters: SourceAdapter[] = FEEDS.map((feed) => ({
  id: feed.id,
  label: feed.label,
  tier: feed.tier,
  fetch: () => fetchFeed(feed),
}));
