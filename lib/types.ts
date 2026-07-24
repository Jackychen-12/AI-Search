export type CategoryKey =
  | "ai-models"
  | "ai-products"
  | "industry"
  | "paper"
  | "tip";

export type Mode = "selected" | "all";

export type DataSourceMode = "auto" | "local" | "aihot" | "mock";

export type DataOrigin = "local" | "aihot" | "mock";

export interface Category {
  key: CategoryKey;
  label: string;
  desc: string;
}

export interface AIItem {
  id: string;
  title: string;
  titleEn?: string | null;
  summary: string | null;
  source: string;
  sourceUrl: string;
  category: CategoryKey | null;
  publishedAt: string | null;
  tags?: string[];
  heat?: number;
  aiSelected?: boolean;
  /** Adapter that produced this item, e.g. "hf-papers" / "github" / "rss:36kr". */
  origin?: string;
  /** When the crawler fetched this item (ISO). */
  fetchedAt?: string | null;
  /** First time this system saw the item (ISO) — from snapshot diff, drives NEW/freshness. */
  firstSeen?: string | null;
  /** One-sentence AI take, generated at build time (cached). Null when unavailable. */
  aiNote?: string | null;
  /** Cover image URL (extracted from the feed item, if any). */
  image?: string | null;
}

export interface ItemsQuery {
  mode?: Mode;
  category?: CategoryKey | "all";
  source?: string;
  page?: number;
  pageSize?: number;
  keyword?: string;
  since?: string;
  sort?: "heat" | "latest";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source: DataOrigin;
  fallbackReason?: string;
}

export interface DailyReport {
  date: string;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  /** 当日新收录总数（未截断）—— 供客户端按当前语言组装导语。 */
  newCount?: number;
  lead: { title: string; leadParagraph: string } | null;
  /** 今日精选 —— 跨板块的当日重点条目。 */
  featured?: {
    id?: string;
    title: string;
    summary: string | null;
    aiNote?: string | null;
    sourceUrl: string;
    sourceName: string;
    category: CategoryKey | null;
  }[];
  sections: {
    label: string;
    items: {
      id?: string;
      title: string;
      summary: string | null;
      aiNote?: string | null;
      sourceUrl: string;
      sourceName: string;
    }[];
  }[];
  flashes?: {
    title: string;
    sourceName: string;
    sourceUrl: string;
    publishedAt: string;
  }[];
}

export interface DailyIndexItem {
  date: string;
  generatedAt: string;
  leadTitle: string | null;
}

export interface DigestPick {
  title: string;
  sourceUrl: string;
  source: string;
  reason: string;
}

/** "AI 每日必读" — a few must-reads picked from the day's content (built daily). */
export interface Digest {
  date: string; // BJ date, e.g. 2026-05-29
  generatedAt: string;
  picks: DigestPick[];
  /** Short AI summary of what's hot this week (shown under 本周最热). */
  trendSummary?: string;
}
