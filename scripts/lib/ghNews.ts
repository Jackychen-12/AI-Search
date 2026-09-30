import type { AIItem } from "../../lib/types";
import { cleanText } from "../../lib/text";
import type { GhNews } from "../../lib/ghTrending";

// "为什么火" — find site news items that talk about a trending repo.
// Precision over recall: a false "related news" link is worse than none, so
// a match needs one of
//   1. the item links to github.com/owner/name (Show HN posts, etc.)
//   2. the text contains "owner/name"
//   3. the repo name AND its owner (or a known alias) both appear
//   4. a distinctive name (camelCase / has digits, ≥ 6 chars) appears on its own
// Common-word names ("skills", "router", "ax") only ever match via 1–2.

const WINDOW_DAYS = 45;
const MAX_PER_REPO = 5;

const OWNER_ALIASES: Record<string, string[]> = {
  anthropics: ["anthropic"],
  openai: ["openai"],
  google: ["google", "谷歌"],
  "google-deepmind": ["deepmind", "google"],
  "google-research": ["google"],
  googlecloudplatform: ["google"],
  microsoft: ["microsoft", "微软"],
  facebookresearch: ["meta"],
  "meta-llama": ["meta"],
  nvidia: ["nvidia", "英伟达"],
  nvlabs: ["nvidia", "英伟达"],
  tencent: ["tencent", "腾讯"],
  tencentarc: ["tencent", "腾讯"],
  tencentcloud: ["tencent", "腾讯"],
  "tencent-hunyuan": ["tencent", "腾讯", "混元"],
  alibaba: ["alibaba", "阿里"],
  qwenlm: ["qwen", "通义", "千问"],
  baidu: ["baidu", "百度"],
  bytedance: ["bytedance", "字节"],
  "deepseek-ai": ["deepseek"],
  huggingface: ["hugging face", "huggingface"],
  "heygen-com": ["heygen"],
};

/** Names too generic to trust without an explicit link. */
const GENERIC = new Set([
  "skills", "agents", "agent", "router", "plugins", "coder", "atlas", "orca", "up", "ax", "bend",
  "substrate", "harness", "memory", "macro", "fabric", "openvino", "cookbook", "rag", "mcp",
]);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Owner terms that count as independent evidence: known aliases, or the owner
 * handle itself ("paperclipai" → "paperclip ai"). A term equal to the repo
 * name proves nothing ("paperclip" would match "the paperclip maximizer").
 */
function ownerTerms(owner: string, nameLower: string): string[] {
  const o = owner.toLowerCase();
  if (OWNER_ALIASES[o]) return OWNER_ALIASES[o];
  const terms = new Set<string>([o.replace(/[-_]+/g, " ").replace(/(?<=\w{4})ai$/, " ai")]);
  const base = o.replace(/[-_](ai|io|hq|inc|org|dev|labs?|team|app|com)$/, "");
  if (base !== o) terms.add(base.replace(/[-_]+/g, " "));
  return [...terms].filter((t) => t.length >= 3 && t !== nameLower);
}

function wordRe(term: string): RegExp {
  // Latin terms get word boundaries; CJK aliases match as plain substrings.
  return /^[\x00-\x7f]+$/.test(term) ? new RegExp(`\\b${esc(term).replace(/\\?[ ]/g, "[\\s_-]?")}\\b`, "i") : new RegExp(esc(term));
}

export interface RepoRef {
  fullName: string;
}

export function matchNews(repos: RepoRef[], items: AIItem[], now = Date.now()): Map<string, GhNews[]> {
  const cutoff = now - WINDOW_DAYS * 86_400_000;
  const pool = items.filter((i) => {
    if (i.origin === "github" || i.origin === "hf-papers") return false; // repo / paper entries, not news
    const t = Date.parse(i.publishedAt ?? i.firstSeen ?? "");
    return !Number.isNaN(t) && t >= cutoff;
  });
  const prepared = pool.map((i) => ({ item: i, url: i.sourceUrl.toLowerCase(), text: `${i.title} ${i.summary ?? ""}` }));

  const out = new Map<string, GhNews[]>();
  for (const r of repos) {
    const [owner, name] = r.fullName.split("/");
    const full = r.fullName.toLowerCase();
    const urlRe = new RegExp(`github\\.com/${esc(full)}(?:[/#?]|$)`);
    const fullRe = new RegExp(`\\b${esc(full)}\\b`, "i");
    const nameNorm = name.replace(/[-_.]+/g, " ").trim();
    // Monorepos named after their owner ("google-research/google-research") would match every org mention.
    const generic = GENERIC.has(nameNorm.toLowerCase()) || nameNorm.length < 4 || name.toLowerCase() === owner.toLowerCase();
    const nameRe = generic ? null : wordRe(nameNorm);
    const owners = ownerTerms(owner, nameNorm.toLowerCase()).map(wordRe);
    const distinctive = !generic && name.length >= 6 && (/[a-z][A-Z]/.test(name) || /\d/.test(name));

    const hits: GhNews[] = [];
    const seen = new Set<string>();
    for (const { item, url, text } of prepared) {
      const ok =
        urlRe.test(url) ||
        fullRe.test(text) ||
        (nameRe !== null && nameRe.test(text) && (distinctive || owners.some((o) => o.test(text))));
      if (!ok || seen.has(item.id)) continue;
      seen.add(item.id);
      hits.push({
        id: item.id,
        title: cleanText(item.title),
        url: item.sourceUrl,
        source: item.source,
        date: item.publishedAt ?? item.firstSeen ?? null,
      });
    }
    if (hits.length) {
      hits.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      out.set(full, hits.slice(0, MAX_PER_REPO));
    }
  }
  return out;
}
