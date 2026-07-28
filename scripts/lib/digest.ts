import fs from "node:fs";
import { DIGEST_PATH } from "../../lib/config";
import type { AIItem, Digest, DigestPick } from "../../lib/types";
import { extractJsonArray, stripRefMarks } from "../../lib/llmClean";
import { bjDate } from "./time";

// "AI 每日必读": once per day, ask DeepSeek to pick a few must-reads from the
// day's pool + a one-line reason. Cached by date (no repeat cost on same-day
// pushes). No DEEPSEEK_API_KEY -> previous digest kept (or empty), card hidden.

const API = "https://api.deepseek.com/chat/completions";
const KEY = process.env.DEEPSEEK_API_KEY || "";
const MODEL = process.env.LLM_MODEL || "deepseek-chat";
const PICK = Number(process.env.DIGEST_PICKS || 5);
const POOL = 18;
const WINDOW_MS = 72 * 60 * 60 * 1000;

function readPrev(): Digest | null {
  try {
    return JSON.parse(fs.readFileSync(DIGEST_PATH, "utf8")) as Digest;
  } catch {
    return null;
  }
}

function write(d: Digest): void {
  fs.writeFileSync(DIGEST_PATH, JSON.stringify(d, null, 2) + "\n", "utf8");
}

function candidates(items: AIItem[]): AIItem[] {
  const now = Date.now();
  const recent = items.filter((i) => {
    if (i.aiSelected === false) return false;
    const t = Date.parse(i.publishedAt ?? i.firstSeen ?? "");
    return Number.isFinite(t) && now - t < WINDOW_MS;
  });
  const pool = (recent.length >= PICK ? recent : items.slice())
    .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))
    .slice(0, POOL);
  return pool;
}

async function pickWithLLM(pool: AIItem[]): Promise<DigestPick[]> {
  const listing = pool
    .map((it, i) => `${i + 1}. 【${it.source}】${it.title}${it.summary ? ` — ${it.summary.slice(0, 80)}` : ""}`)
    .join("\n");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "你是资深 AI 资讯主编。从候选列表里挑出今天最值得一读的条目，" +
              `挑 ${Math.min(PICK, 5)} 条，按重要性排序。只返回 JSON 数组，每项形如 ` +
              '{"n": 编号, "reason": "不超过30字的中文推荐理由"}，不要其它文字。',
          },
          { role: "user", content: listing },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    // Models wrap JSON in fences/prose at will — extract defensively.
    const arr = extractJsonArray<{ n: number; reason: string }>(raw) ?? [];
    const picks: DigestPick[] = [];
    for (const { n, reason } of arr) {
      const it = pool[n - 1];
      const cleaned = stripRefMarks(String(reason ?? ""));
      if (it && cleaned) picks.push({ title: it.title, sourceUrl: it.sourceUrl, source: it.source, reason: cleaned.slice(0, 40) });
    }
    return picks.slice(0, PICK);
  } finally {
    clearTimeout(timer);
  }
}

/** Build (or reuse) today's digest and write data/digest.json. */
async function summarizeTrend(items: AIItem[]): Promise<string> {
  const top = [...items].sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0)).slice(0, 10);
  if (top.length === 0) return "";
  const listing = top.map((it, i) => `${i + 1}. ${it.title}`).join("\n");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 160,
        messages: [
          {
            role: "system",
            content:
              "你是 AI 资讯主编。根据给定的本周最热条目，用 50 字以内中文概括本周 AI 圈的热点趋势，口吻自然连贯，不分点、不加引号、不复述标题。",
          },
          { role: "user", content: listing },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return stripRefMarks((data.choices?.[0]?.message?.content ?? "").replace(/\s+/g, " ").trim()).slice(0, 100);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function buildDigest(items: AIItem[]): Promise<void> {
  const today = bjDate();
  const prev = readPrev();
  if (prev && prev.date === today && prev.picks.length > 0 && prev.trendSummary) {
    console.log("[digest] today's digest already complete — skipping.");
    return;
  }
  if (!KEY) {
    console.log("[digest] no DEEPSEEK_API_KEY — skipping digest.");
    if (!prev) write({ date: today, generatedAt: new Date().toISOString(), picks: [] });
    return;
  }
  try {
    const pool = candidates(items);
    if (pool.length < 3) {
      console.log("[digest] not enough candidates.");
      return;
    }
    const picks = await pickWithLLM(pool);
    const trendSummary = await summarizeTrend(items);
    write({ date: today, generatedAt: new Date().toISOString(), picks, trendSummary });
    console.log(`[digest] ${picks.length} picks + trend summary for ${today}.`);
  } catch (e) {
    console.log(`[digest] failed: ${e instanceof Error ? e.message : e}`);
  }
}

/** Generate a structured weekly insight report via DeepSeek (800-1200 chars). */
export async function buildWeeklyInsight(items: AIItem[], startDate: string, endDate: string): Promise<string> {
  if (!KEY) {
    console.log("[weekly-insight] no DEEPSEEK_API_KEY — skipping.");
    return "";
  }
  const weekItems = items.filter((i) => {
    const d = (i.publishedAt ?? i.firstSeen ?? "").slice(0, 10);
    return d >= startDate && d <= endDate;
  });
  if (weekItems.length < 10) {
    console.log("[weekly-insight] not enough items for weekly insight.");
    return "";
  }
  const byHeat = [...weekItems].sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0));
  const listing = byHeat.slice(0, 30).map((it, i) =>
    `${i + 1}. 【${it.source}】${it.title}${it.aiNote ? ` — ${it.aiNote}` : ""}`
  ).join("\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 2600, // 800-1200 Chinese chars ≈ 1600-2400 tokens; headroom so the tail never gets cut
        messages: [
          {
            role: "system",
            content:
              "你是资深 AI 行业分析师。基于本周 AI 资讯，撰写一篇 800-1200 字的结构化周度洞察报告。" +
              "严格按以下结构输出，使用 Markdown 格式：\n\n" +
              "## 本周关键事件\n按影响力排序列出 3-5 件最重要的事件，每件用一句话说明为什么重要。\n\n" +
              "## 趋势研判\n分析哪个方向在升温（如 Agent、多模态、开源），哪个在降温，给出判断依据。\n\n" +
              "## 值得关注\n挑出一条被低估但有潜力的信息，说明为什么值得关注；再给出下周可能的看点预判。\n\n" +
              "硬性要求：\n" +
              "1. 绝对禁止使用 #编号 引用条目（如 (#3)、（#2、#5））——读者看不到编号列表，必须直接写出事件/公司名称；\n" +
              "2. 每个论点自包含，不依赖外部上下文；\n" +
              "3. 有观点、有判断、不泛泛而谈，用数据和事实支撑论点；\n" +
              "4. 不要输出任何开场白、自我介绍或过渡语，直接从第一个 ## 标题开始，写完最后一句完整结束。",
          },
          {
            role: "user",
            content: `本周（${startDate} ~ ${endDate}）共收录 ${weekItems.length} 条 AI 资讯，以下是按热度排序的 Top 30：\n\n${listing}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    // Prompt bans #编号 references, but enforce it in code too — readers never
    // see the numbered listing, so leftover (#3、#7) marks read as garbage.
    const text = stripRefMarks((data.choices?.[0]?.message?.content ?? "").trim());
    console.log(`[weekly-insight] generated ${text.length} chars for ${startDate} ~ ${endDate}.`);
    return text;
  } catch (e) {
    console.log(`[weekly-insight] failed: ${e instanceof Error ? e.message : e}`);
    return "";
  } finally {
    clearTimeout(timer);
  }
}
