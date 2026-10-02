// One-line Chinese takes for GitHub trends — prompt + post-processing.

export const NOTE_SYSTEM =
  "你是 AI 开源生态分析师。给定一个 GitHub 仓库的名称和英文简介，用一句 25 到 40 个汉字的中文解读：" +
  "先说它是什么，再点出它的独特之处。只写事实，不要使用“值得关注”“值得一试”“不容错过”之类的套话，" +
  "不要复述仓库名，不加引号、不加前缀，以句号结尾。";

/**
 * Trailing boilerplate the model likes to append: "…，值得关注。", "值得关注因其…。",
 * "值得想深入理解原理的开发者关注。" — any final clause that starts with 值得.
 */
const FILLER = /[，,；;。]?\s*(?:非常|十分|很|尤其)?值得[^。！？]*[。！？]?$/;

const MAX = 70;

/**
 * Normalise a note. `fresh` = straight from the model: a missing full stop is
 * just sloppy punctuation and an over-long take is trimmed at a clause boundary.
 * For cached notes a missing full stop means an old hard cut mid-sentence, so
 * null is returned and the crawler regenerates it.
 */
export function cleanNote(raw: string | null | undefined, fresh = false): string | null {
  if (!raw) return null;
  let s = raw.replace(/^["“”'']+|["“”'']+$/g, "").replace(/\s+/g, " ").trim();
  s = s.replace(FILLER, "。").replace(/[，,；;、]\s*。$/, "。").replace(/([。！？])[。！？]+$/, "$1");
  if (fresh) {
    if (s.length > MAX) {
      const cut = Math.max(s.lastIndexOf("。", MAX - 1), s.lastIndexOf("，", MAX - 1), s.lastIndexOf("；", MAX - 1));
      if (cut < 12) return null;
      s = s.slice(0, cut) + "。";
    }
    if (!/[。！？.!?]$/.test(s)) s += "。";
  }
  if (!/[。！？.!?]$/.test(s)) return null;
  if (s.length < 8 || s.length > MAX) return null;
  return s;
}

// --- Chinese keywords per repo (search) ----------------------------------------

export const TAG_SYSTEM =
  "你是 AI 开源项目的编目员。用户会给出若干 GitHub 仓库（名称、英文简介、中文解读）。" +
  "为每个仓库写 5 到 8 个中文关键词，供中文用户搜索：覆盖它是什么（品类）、解决什么问题（场景）、面向谁、用到的关键技术。" +
  "关键词要是 2 到 6 个汉字的常用说法，例如：界面设计、语音克隆、浏览器自动化、长期记忆、代码评审；" +
  "专有名词可保留英文（如 RAG、MCP、Claude Code）。不要写仓库名，不要写“人工智能”“开源”“工具”这类所有项目都有的词。" +
  '只输出 JSON 对象，键是仓库全名，值是关键词数组，例如 {"owner/name": ["关键词一", "关键词二"]}。';

const TAG_NOISE = new Set(["人工智能", "ai", "开源", "工具", "项目", "github", "开源项目", "开源工具"]);

/**
 * Parse the model's JSON answer into repo → keywords. Tolerant by design: a
 * code fence, a missing repo or a junk entry just yields fewer keywords.
 */
export function parseTags(raw: string | null | undefined, expected: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!raw) return out;
  let data: unknown;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return out;
  }
  if (!data || typeof data !== "object") return out;
  const byKey = new Map(Object.entries(data as Record<string, unknown>).map(([k, v]) => [k.trim().toLowerCase(), v]));
  for (const fullName of expected) {
    const value = byKey.get(fullName.toLowerCase());
    if (!Array.isArray(value)) continue;
    const tags: string[] = [];
    for (const item of value) {
      if (typeof item !== "string") continue;
      const tag = item.replace(/["“”'']/g, "").replace(/\s+/g, " ").trim();
      if (tag.length < 2 || tag.length > 16 || TAG_NOISE.has(tag.toLowerCase()) || tags.includes(tag)) continue;
      tags.push(tag);
    }
    if (tags.length > 0) out.set(fullName, tags.slice(0, 8));
  }
  return out;
}
