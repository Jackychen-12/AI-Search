// One-line Chinese takes for GitHub trends — prompt + post-processing.

export const NOTE_SYSTEM =
  "你是 AI 开源生态分析师。给定一个 GitHub 仓库的名称和英文简介，用一句 25 到 40 个汉字的中文解读：" +
  "先说它是什么，再点出它的独特之处。只写事实，不要使用“值得关注”“值得一试”“不容错过”之类的套话，" +
  "不要复述仓库名，不加引号、不加前缀，以句号结尾。";

/** Trailing boilerplate the model likes to append ("…，值得关注。" / "值得关注因其…。"). */
const FILLER = /[，,；;]?\s*(?:非常|十分|很|尤其)?值得(?:关注|一试|期待|一看|留意|尝试|收藏)[^。！？]*[。！？]?$/;

/**
 * Normalise a note; returns null when it's unusable — e.g. cut off mid-sentence
 * (no closing punctuation) — so the crawler regenerates it next run.
 */
export function cleanNote(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.replace(/^["“”'']+|["“”'']+$/g, "").replace(/\s+/g, " ").trim();
  s = s.replace(FILLER, "。").replace(/[，,；;、]\s*。$/, "。").replace(/([。！？])[。！？]+$/, "$1");
  if (!/[。！？.!?]$/.test(s)) return null;
  if (s.length < 8 || s.length > 70) return null;
  return s;
}
