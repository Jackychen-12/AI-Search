// Search for the GitHub AI 趋势 page (client-safe).
//
// Queries are short natural-language phrases, often Chinese ("优化 AI 设计 UI
// 相关的项目"), while repo descriptions are mostly English. So a query is
// reduced to *concept groups* — each a set of Chinese/English ways to say the
// same thing — and a repo matches a group when any of its terms appears.

import { GH_FUN_KINDS, GH_TRACK_MAP, type GhRepo } from "./ghTrending";

/**
 * Bilingual concept groups. Latin terms match as word prefixes ("design" also
 * hits "designer"); terms of ≤ 2 letters must be whole words. The first Latin
 * term is the keyword used when the query is sent to GitHub's own search.
 */
const CONCEPTS: string[][] = [
  ["设计", "design"],
  ["界面", "前端", "ui", "ux", "frontend", "interface", "gui"],
  ["智能体", "代理", "agent", "agentic"],
  ["多智能体", "multi-agent", "multi agent", "multiagent", "swarm"],
  ["编程", "代码", "写代码", "coding", "code", "programming", "developer"],
  ["记忆", "memory"],
  ["浏览器", "browser", "chrome", "playwright"],
  ["自动化", "automation", "automate", "automated"],
  ["语音", "声音", "配音", "voice", "speech", "tts", "audio"],
  ["克隆", "clon"],
  ["音乐", "歌", "music", "song"],
  ["视频", "video"],
  ["图像", "图片", "绘画", "画图", "image", "picture", "drawing", "diffusion"],
  ["游戏", "game", "gaming"],
  ["桌宠", "宠物", "陪伴", "pet", "companion"],
  ["知识库", "检索", "rag", "retrieval", "knowledge"],
  ["文档", "document", "docs", "pdf", "ocr"],
  ["办公", "表格", "幻灯片", "office", "spreadsheet", "slides", "excel"],
  ["数据库", "database", "sql"],
  ["搜索引擎", "search"],
  ["机器学习", "深度学习", "machine learning", "deep learning", "ml"],
  ["安全", "审计", "security", "audit", "pentest", "red team"],
  ["金融", "股票", "交易", "量化交易", "finance", "financial", "stock", "trading", "quant"],
  ["机器人", "具身", "robot", "embodied", "humanoid", "vla"],
  ["世界模型", "world model", "world-model"],
  ["论文", "学术", "研究", "paper", "research", "arxiv"],
  ["教程", "课程", "入门", "学习", "tutorial", "course", "beginner", "lesson"],
  ["推理", "inference", "serving"],
  ["训练", "微调", "training", "fine-tun", "finetun", "lora"],
  ["大模型", "模型", "model", "llm"],
  ["部署", "deploy", "self-hosted"],
  ["提示词", "提示", "prompt"],
  ["技能", "skill"],
  ["工作流", "workflow", "pipeline"],
  ["终端", "命令行", "terminal", "cli"],
  ["桌面", "desktop"],
  ["手机", "移动端", "移动", "mobile", "android", "ios"],
  ["本地", "离线", "local", "offline", "self-hosted", "on-device"],
  ["网关", "路由", "gateway", "router", "proxy"],
  ["评测", "基准", "benchmark", "eval"],
  ["图表", "架构图", "可视化", "diagram", "chart", "visualiz"],
  ["翻译", "translat"],
  ["写作", "小说", "writing", "novel", "story"],
  ["爬虫", "抓取", "scrap", "crawl"],
  ["测试", "test"],
  ["数据", "data"],
  ["插件", "plugin", "extension"],
  ["协作", "团队", "collaborat", "team"],
  ["电脑操控", "操控电脑", "computer-use", "computer use"],
];

/** Vague intent words: they help ranking but are never required, and aren't sent to GitHub. */
const SOFT: string[][] = [["优化", "提升", "改进", "改善", "更好", "增强", "optimiz", "improv", "better", "enhanc"]];

/** Carry no meaning for this page — nearly every repo here is an open-source AI project. */
const NOISE = new Set([
  "ai", "人工智能", "github", "相关", "有关", "关于", "项目", "仓库", "工具", "开源", "帮我", "我想", "我希望", "希望", "想要", "查找",
  "寻找", "搜索", "一些", "哪些", "有没有", "可以", "能够", "用来", "用于", "方面", "类似", "什么", "的", "跟", "和", "与", "上", "找", "做",
  "能", "及", "或", "等", "是", "在", "跑", "用", "让", "把", "来", "运行", "使用", "repo", "repos", "project", "projects", "related", "about", "for", "the", "and", "with", "of", "to", "a", "an",
]);

const CJK = /[一-鿿]/;

export interface GhQueryGroup {
  terms: string[];
  soft: boolean;
}

export interface GhQuery {
  groups: GhQueryGroup[];
}

const ALL_GROUPS: GhQueryGroup[] = [...CONCEPTS.map((terms) => ({ terms, soft: false })), ...SOFT.map((terms) => ({ terms, soft: true }))];

/** Dictionary of every known CJK term (concepts, soft words, noise), longest first, for greedy segmentation. */
const CJK_TERMS = [...ALL_GROUPS.flatMap((g) => g.terms), ...NOISE].filter((t) => CJK.test(t)).sort((a, b) => b.length - a.length);

function groupFor(token: string): GhQueryGroup {
  // Latin tokens map onto a concept when they extend one of its terms ("designer" → "design").
  const hit = ALL_GROUPS.find((g) => g.terms.some((t) => t === token || (!CJK.test(t) && t.length > 2 && token.startsWith(t))));
  return hit ?? { terms: [token], soft: false };
}

export function parseGhQuery(raw: string): GhQuery {
  const text = raw.toLowerCase().trim();
  const tokens: string[] = [];
  for (const run of text.match(/[a-z0-9][a-z0-9.+#-]*|[一-鿿]+/g) ?? []) {
    if (!CJK.test(run)) {
      tokens.push(run);
      continue;
    }
    // Greedy longest-match over known terms; unknown stretches are kept literally.
    let unknown = "";
    const flush = () => {
      if (unknown.length >= 2) tokens.push(unknown);
      unknown = "";
    };
    for (let i = 0; i < run.length; ) {
      const term = CJK_TERMS.find((t) => run.startsWith(t, i));
      if (term) {
        flush();
        tokens.push(term);
        i += term.length;
      } else {
        unknown += run[i++];
      }
    }
    flush();
  }
  const groups: GhQueryGroup[] = [];
  for (const tok of tokens) {
    if (NOISE.has(tok)) continue;
    const g = groupFor(tok);
    if (!groups.includes(g) && !groups.some((x) => x.terms[0] === g.terms[0])) groups.push(g);
  }
  return { groups };
}

// --- matching ---------------------------------------------------------------

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * "为智能体设计" / "designed for agents" say what a tool is *for*, not that it is
 * about design — without these guards half the list would match "设计".
 */
const GUARDED: Record<string, RegExp> = {
  设计: /(?<!为[^，。；,.;]{0,14})设计/,
  design: /(^|[^a-z0-9])design(?!ed)/,
};

const termRe = new Map<string, RegExp>(Object.entries(GUARDED));
function matcher(term: string): RegExp {
  let re = termRe.get(term);
  if (!re) {
    re = CJK.test(term)
      ? new RegExp(esc(term))
      : new RegExp(`(^|[^a-z0-9])${esc(term).replace(/[ -]/g, "[ -]?")}${term.length <= 2 ? "($|[^a-z0-9])" : ""}`);
    termRe.set(term, re);
  }
  return re;
}

interface Fields {
  name: string;
  topics: string;
  note: string;
  desc: string;
  extra: string;
}
const WEIGHT: Record<keyof Fields, number> = { name: 5, topics: 3, note: 3, desc: 2, extra: 1 };

const fieldCache = new WeakMap<GhRepo, Fields>();
function fieldsOf(r: GhRepo): Fields {
  let f = fieldCache.get(r);
  if (!f) {
    const track = GH_TRACK_MAP[r.track];
    const fun = r.fun ? GH_FUN_KINDS[r.fun] : null;
    f = {
      name: r.fullName.toLowerCase().replace(/[/_.]+/g, " "),
      topics: (r.topics ?? []).join(" ").toLowerCase(),
      note: (r.aiNote ?? "").toLowerCase(),
      desc: (r.description ?? "").toLowerCase(),
      extra: [track?.zh, track?.en, fun?.zh, fun?.en, r.paper?.title, r.language].filter(Boolean).join(" ").toLowerCase(),
    };
    fieldCache.set(r, f);
  }
  return f;
}

/** Best field weight at which the group appears in the repo, or 0. */
function groupHit(g: GhQueryGroup, f: Fields): number {
  let best = 0;
  for (const term of g.terms) {
    const re = matcher(term);
    for (const k of Object.keys(WEIGHT) as (keyof Fields)[]) {
      if (WEIGHT[k] > best && f[k] && re.test(f[k])) best = WEIGHT[k];
    }
  }
  return best;
}

export interface GhSearchHit {
  repo: GhRepo;
  score: number;
}

/**
 * Rank repos for a query. Rare concepts count more than common ones (idf), and
 * only repos scoring at least half of the best match are kept — so a query for
 * "design + ui" returns projects about both, not everything with a web UI.
 */
export function searchGhRepos(repos: GhRepo[], query: GhQuery): GhSearchHit[] {
  if (query.groups.length === 0) return [];
  const hits = repos.map((repo) => ({ repo, w: query.groups.map((g) => groupHit(g, fieldsOf(repo))) }));
  const idf = query.groups.map((g, i) => {
    const df = hits.filter((h) => h.w[i] > 0).length;
    return Math.log(1 + repos.length / (1 + df)) * (g.soft ? 0.4 : 1);
  });
  const hard = query.groups.some((g) => !g.soft);
  const scored = hits
    .map((h) => ({
      repo: h.repo,
      score: h.w.reduce((s, w, i) => s + w * idf[i], 0),
      // A vague word alone ("优化") must not qualify a repo when the query names real concepts.
      ok: h.w.some((w, i) => w > 0 && (!hard || !query.groups[i].soft)),
    }))
    .filter((h) => h.ok && h.score > 0);
  const top = Math.max(0, ...scored.map((h) => h.score));
  return scored
    .filter((h) => h.score >= top * 0.5)
    .sort((a, b) => b.score - a.score || b.repo.stars - a.repo.stars)
    .map(({ repo, score }) => ({ repo, score }));
}

// --- GitHub-wide search -------------------------------------------------------

const AIISH = /^(agent|agentic|llm|model|rag|mcp|prompt|gpt|claude|copilot|diffusion|inference|world model)/;

/** Query string for GitHub's repository search: English keywords, AI-scoped, recently active. */
export function ghWideQuery(query: GhQuery, now: number): string | null {
  const kws = query.groups
    .filter((g) => !g.soft)
    .map((g) => g.terms.find((t) => !CJK.test(t)) ?? g.terms[0])
    // Stemmed dictionary forms ("clon", "optimiz") are for local matching; GitHub wants whole words.
    .map((k) => ({ clon: "clone", translat: "translation", scrap: "scraper", crawl: "crawler", collaborat: "collaboration", visualiz: "visualization", "fine-tun": "fine-tuning" })[k] ?? k);
  if (kws.length === 0) return null;
  const latin = kws.filter((k) => !CJK.test(k));
  if (latin.length > 0) kws.splice(0, kws.length, ...latin);
  if (!kws.some((k) => AIISH.test(k))) kws.push("ai");
  const since = new Date(now - 180 * 86_400_000).toISOString().slice(0, 10);
  return `${kws.join(" ")} in:name,description,topics stars:>100 pushed:>${since}`;
}
