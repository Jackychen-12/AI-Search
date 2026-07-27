import type { AIItem } from "../../lib/types";

export interface SourceAdapter {
  /** Stable adapter id, e.g. "hf-papers", "github", "rss:36kr". */
  id: string;
  /** Human-readable label for logs. */
  label: string;
  /** Source credibility tier: 1 = first-party/official, 2 = authoritative media, 3 = aggregator/repost. */
  tier: 1 | 2 | 3;
  /** Fetch and normalize this source's items. Throwing fails only this source. */
  fetch(): Promise<AIItem[]>;
}
