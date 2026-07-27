/**
 * Post-processing guards for LLM output. Prompts *ask* the model not to emit
 * item-number references or wrapper text, but models don't always comply —
 * these strip the leftovers in code so junk never reaches the site.
 */

/**
 * Remove #编号 references like （#3、#7、#12）/ (#5) / (#2, #8) — including
 * the "（、、）" husks left when numbers were partially removed upstream.
 */
export function stripRefMarks(s: string): string {
  return (
    s
      // full bracket groups whose content is only #numbers + separators
      .replace(/[（(]\s*(?:#\d+\s*[、,，\s]*)+[)）]/g, "")
      // bare #N mentions in running text
      .replace(/#\d+\b/g, "")
      // husks: brackets containing only separators/whitespace
      .replace(/[（(]\s*[、,，\s]*[)）]/g, "")
      // separators doubled-up by the removals above
      .replace(/[ \t]{2,}/g, " ")
      .replace(/(、){2,}/g, "、")
      .replace(/、\s*([。；;.!？?])/g, "$1")
      .replace(/[ \t]+([。；；;.!？?，,）)])/g, "$1")
      .trim()
  );
}

/**
 * Extract the first JSON array from an LLM reply that may be wrapped in
 * ```json fences, prose, or trailing commentary. Returns null when nothing
 * parseable is found (callers treat that as "no result", never a crash).
 */
export function extractJsonArray<T>(raw: string): T[] | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const candidates = [cleaned];
  const m = cleaned.match(/\[[\s\S]*\]/);
  if (m) candidates.push(m[0]);
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      /* try next candidate */
    }
  }
  return null;
}
