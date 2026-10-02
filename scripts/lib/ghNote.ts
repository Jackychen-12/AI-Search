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
