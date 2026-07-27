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
  /** Google-News-style titles end with " - Publisher"; strip that suffix. */
  stripTitleSource?: boolean;
}

// Reputable, public RSS/Atom feeds spanning Chinese + English AI coverage:
// model labs, research blogs, the tech press, newsletters and community.
// Each is fetched independently — a single dead feed never sinks the crawl.
// Every URL here has been probed to return valid XML with items (2026-07).
//
// X/Twitter coverage: X has no public API/RSS and public RSSHub/Nitter
// instances are blocked, so X signal comes in via AI News (news.smol.ai),
// which recaps high-signal X/Reddit/Discord discussions daily.
const FEEDS: FeedDef[] = [
  // ══ Tier 1 — 一手官方 / 模型实验室 / 研究机构 ══
  { id: "rss:openai", label: "OpenAI News", url: "https://openai.com/news/rss.xml", source: "OpenAI", category: "ai-models", tier: 1 },
  // Anthropic/Meta AI killed their RSS endpoints — Google News site-scoped
  // feeds track their newsrooms instead (titles carry a " - publisher" suffix).
  { id: "rss:anthropic", label: "Anthropic News (via Google News)", url: "https://news.google.com/rss/search?q=site:anthropic.com&hl=en-US&gl=US&ceid=US:en", source: "Anthropic", category: "ai-models", tier: 1, stripTitleSource: true },
  { id: "rss:meta-ai", label: "Meta AI (via Google News)", url: "https://news.google.com/rss/search?q=site:ai.meta.com&hl=en-US&gl=US&ceid=US:en", source: "Meta AI", category: "ai-models", tier: 1, stripTitleSource: true },
  { id: "rss:google-ai", label: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", source: "Google AI", category: "ai-models", tier: 1 },
  { id: "rss:deepmind", label: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", source: "Google DeepMind", category: "ai-models", tier: 1 },
  { id: "rss:google-research", label: "Google Research", url: "https://research.google/blog/rss/", source: "Google Research", category: "paper", aiOnly: true, tier: 1 },
  { id: "rss:nvidia", label: "NVIDIA Blog", url: "https://blogs.nvidia.com/feed/", source: "NVIDIA", category: "ai-models", aiOnly: true, tier: 1 },
  { id: "rss:hf-blog", label: "HuggingFace Blog", url: "https://huggingface.co/blog/feed.xml", source: "HuggingFace Blog", category: "tip", tier: 1 },
  { id: "rss:mistral", label: "Mistral AI Blog", url: "https://mistral.ai/rss.xml", source: "Mistral AI", category: "ai-models", tier: 1 },
  { id: "rss:cohere", label: "Cohere Blog", url: "https://cohere.com/blog/rss.xml", source: "Cohere", category: "ai-models", tier: 1 },
  { id: "rss:qwen", label: "Qwen Blog", url: "https://qwenlm.github.io/blog/index.xml", source: "通义千问 Qwen", category: "ai-models", tier: 1 },
  { id: "rss:apple-ml", label: "Apple ML Research", url: "https://machinelearning.apple.com/rss.xml", source: "Apple ML Research", category: "paper", tier: 1 },
  { id: "rss:bair", label: "BAIR Blog", url: "https://bair.berkeley.edu/blog/feed.xml", source: "Berkeley AI Research", category: "paper", tier: 1 },
  { id: "rss:mit-news-ai", label: "MIT News AI", url: "https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml", source: "MIT News", category: "industry", tier: 1 },
  { id: "rss:msr", label: "Microsoft Research", url: "https://www.microsoft.com/en-us/research/feed/", source: "Microsoft Research", category: "paper", aiOnly: true, tier: 1 },
  { id: "rss:aws-ml", label: "AWS ML Blog", url: "https://aws.amazon.com/blogs/machine-learning/feed/", source: "AWS ML", category: "tip", tier: 2 },

  // ══ Tier 2 — 权威科技媒体 ══
  { id: "rss:theverge-ai", label: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "The Verge", category: "industry", tier: 2 },
  { id: "rss:techcrunch-ai", label: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch", category: "industry", tier: 2 },
  { id: "rss:venturebeat-ai", label: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", source: "VentureBeat", category: "industry", tier: 2 },
  { id: "rss:arstechnica-ai", label: "Ars Technica AI", url: "https://arstechnica.com/ai/feed/", source: "Ars Technica", category: "industry", tier: 2 },
  { id: "rss:techreview-ai", label: "MIT Tech Review AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", source: "MIT Tech Review", category: "industry", tier: 2 },
  { id: "rss:wired-ai", label: "Wired AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", source: "Wired", category: "industry", tier: 2 },
  { id: "rss:thedecoder", label: "The Decoder", url: "https://the-decoder.com/feed/", source: "The Decoder", category: "industry", tier: 2 },
  { id: "rss:marktechpost", label: "MarkTechPost", url: "https://www.marktechpost.com/feed/", source: "MarkTechPost", category: "paper", tier: 2 },
  { id: "rss:semianalysis", label: "SemiAnalysis", url: "https://semianalysis.com/feed/", source: "SemiAnalysis", category: "industry", tier: 2 },

  // ══ Tier 2 — Newsletter / 社区 / 个人博主（高质量原创，含 X 热议回顾）══
  { id: "rss:smol-ainews", label: "AI News (smol.ai, X/Reddit recap)", url: "https://news.smol.ai/rss.xml", source: "AI News", category: "tip", tier: 2 },
  { id: "rss:tldr-ai", label: "TLDR AI", url: "https://tldr.tech/api/rss/ai", source: "TLDR AI", category: "industry", tier: 2 },
  { id: "rss:simonwillison", label: "Simon Willison", url: "https://simonwillison.net/atom/everything/", source: "Simon Willison", category: "tip", aiOnly: true, tier: 2 },
  { id: "rss:lilianweng", label: "Lil'Log", url: "https://lilianweng.github.io/index.xml", source: "Lilian Weng", category: "tip", tier: 2 },
  { id: "rss:raschka", label: "Ahead of AI", url: "https://magazine.sebastianraschka.com/feed", source: "Sebastian Raschka", category: "tip", tier: 2 },
  { id: "rss:thegradient", label: "The Gradient", url: "https://thegradient.pub/rss/", source: "The Gradient", category: "tip", aiOnly: true, tier: 2 },
  { id: "rss:importai", label: "Import AI", url: "https://jack-clark.net/feed/", source: "Import AI", category: "tip", tier: 2 },
  { id: "rss:interconnects", label: "Interconnects", url: "https://www.interconnects.ai/feed", source: "Interconnects", category: "tip", tier: 2 },
  { id: "rss:latentspace", label: "Latent Space", url: "https://www.latent.space/feed", source: "Latent Space", category: "tip", tier: 2 },
  { id: "rss:oneusefulthing", label: "One Useful Thing", url: "https://www.oneusefulthing.org/feed", source: "Ethan Mollick", category: "tip", tier: 2 },
  { id: "rss:bensbites", label: "Ben's Bites", url: "https://www.bensbites.com/feed", source: "Ben's Bites", category: "tip", tier: 2 },

  // ══ Tier 3 — 中文媒体 / 公众号（经 wechat2rss 镜像）══
  { id: "rss:qbitai", label: "量子位", url: "https://www.qbitai.com/feed", source: "量子位", category: "ai-products", tier: 3 },
  { id: "rss:jiqizhixin", label: "机器之心（公众号）", url: "https://wechat2rss.xlab.app/feed/51e92aad2728acdd1fda7314be32b16639353001.xml", source: "机器之心", category: "ai-products", tier: 3 },
  { id: "rss:xinzhiyuan", label: "新智元（公众号）", url: "https://wechat2rss.xlab.app/feed/ede30346413ea70dbef5d485ea5cbb95cca446e7.xml", source: "新智元", category: "industry", tier: 3 },
  { id: "rss:geekpark", label: "极客公园（公众号）", url: "https://wechat2rss.xlab.app/feed/1a5aec98e71c707c8ca092bc2c255b9d4bac477d.xml", source: "极客公园", category: "industry", aiOnly: true, tier: 3 },
  { id: "rss:36kr", label: "36氪", url: "https://36kr.com/feed", source: "36氪", category: "industry", aiOnly: true, tier: 3 },
  { id: "rss:infoq", label: "InfoQ", url: "https://www.infoq.cn/feed", source: "InfoQ", category: "industry", aiOnly: true, tier: 3 },
  { id: "rss:sspai", label: "少数派", url: "https://sspai.com/feed", source: "少数派", category: "ai-products", aiOnly: true, tier: 3 },
  { id: "rss:ithome", label: "IT之家", url: "https://www.ithome.com/rss/", source: "IT之家", category: "industry", aiOnly: true, tier: 3 },
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
    let title = text(it.title).trim();
    // Google-News-style "Headline - Publisher" → cut at the LAST " - "
    // (publisher names may contain hyphens, e.g. "www-cdn.anthropic.com").
    if (feed.stripTitleSource) {
      const cut = title.lastIndexOf(" - ");
      if (cut > 10) title = title.slice(0, cut).trim();
    }
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
