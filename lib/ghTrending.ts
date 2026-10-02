// GitHub AI 趋势 — shared types + track definitions (client-safe; no node imports).
// The snapshot itself is read by lib/ghTrendingStore.ts at build time.

export type GhPeriod = "daily" | "weekly" | "monthly";

export const GH_PERIODS: GhPeriod[] = ["daily", "weekly", "monthly"];

export const GH_PERIOD_DAYS: Record<GhPeriod, number> = { daily: 1, weekly: 7, monthly: 30 };

export type GhTrack =
  | "agent-framework"
  | "coding-agent"
  | "mcp-tools"
  | "ai-app"
  | "world-model"
  | "research"
  | "infra"
  | "learn";

export interface GhTrackDef {
  key: GhTrack;
  zh: string;
  en: string;
  descZh: string;
  descEn: string;
  color: string;
}

/** Display order: the agent ecosystem first, then frontier research, then the model layer. */
export const GH_TRACKS: GhTrackDef[] = [
  { key: "agent-framework", zh: "Agent 框架", en: "Agent Frameworks", descZh: "多智能体编排、Agent SDK / 运行时、Agent 记忆", descEn: "Multi-agent orchestration, SDKs, runtimes, agent memory", color: "#3b6cff" },
  { key: "coding-agent", zh: "编程 Agent", en: "Coding Agents", descZh: "Claude Code / Codex 生态、AI IDE、CLI 助手", descEn: "Claude Code / Codex ecosystem, AI IDEs, CLI assistants", color: "#8b5cf6" },
  { key: "mcp-tools", zh: "MCP · Skills", en: "MCP · Skills", descZh: "MCP Server、Agent Skills、浏览器 / 电脑操控", descEn: "MCP servers, agent skills, browser & computer use", color: "#f59e0b" },
  { key: "ai-app", zh: "AI 应用", en: "AI Apps", descZh: "面向终端用户的 AI 产品与工作台", descEn: "End-user AI products and workspaces", color: "#10b981" },
  { key: "world-model", zh: "世界模型 · 具身", en: "World Models · Embodied", descZh: "世界模型、视频 / 3D 世界生成、机器人与 VLA、物理仿真", descEn: "World models, video/3D world generation, robotics & VLA, simulation", color: "#ef4444" },
  { key: "research", zh: "学术研究", en: "Research", descZh: "附论文的开源代码、研究机构项目、Benchmark 与数据集", descEn: "Paper code, research-lab repos, benchmarks and datasets", color: "#0d9488" },
  { key: "infra", zh: "模型 · 基建", en: "Models · Infra", descZh: "推理引擎、训练微调、RAG 检索、网关路由、开源模型", descEn: "Inference, training, RAG, gateways, open models", color: "#64748b" },
  { key: "learn", zh: "教程 · 资源", en: "Learn", descZh: "课程、教程、书籍与 Awesome 清单", descEn: "Courses, tutorials, books and awesome lists", color: "#a8a29e" },
];

export const GH_TRACK_MAP: Record<GhTrack, GhTrackDef> = Object.fromEntries(
  GH_TRACKS.map((t) => [t.key, t]),
) as Record<GhTrack, GhTrackDef>;

/** "有趣 AI 玩法" — playful uses, orthogonal to the track (a TTS app is still an AI app). */
export type GhFunKind = "game" | "music" | "voice" | "art" | "video" | "companion" | "story" | "quirky";

export const GH_FUN_KINDS: Record<GhFunKind, { zh: string; en: string }> = {
  game: { zh: "游戏", en: "Games" },
  music: { zh: "音乐", en: "Music" },
  voice: { zh: "声音", en: "Voice" },
  art: { zh: "绘画", en: "Art" },
  video: { zh: "视频", en: "Video" },
  companion: { zh: "陪伴", en: "Companions" },
  story: { zh: "故事", en: "Stories" },
  quirky: { zh: "整活", en: "Quirky" },
};

/** Where a repo entered the pool. Trending = GitHub's own velocity list. */
export type GhSource = "trending" | "paper" | "discover";

export interface GhPaper {
  title: string;
  /** HuggingFace paper page (arXiv id based). */
  url: string;
  publishedAt: string | null;
  upvotes: number;
}

export interface GhNews {
  id: string;
  title: string;
  url: string;
  source: string;
  date: string | null;
}

export interface GhRepo {
  /** "owner/name" (GitHub's canonical casing) */
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  /**
   * Stars gained per window. Trending repos: GitHub's own numbers. Others:
   * counted from stargazer timestamps, or exact because the repo was created
   * inside the window. Missing = unknown, never estimated.
   */
  gained: Partial<Record<GhPeriod, number>>;
  track: GhTrack;
  /** Keywords that put the repo in its track — debugging aid for the rules. */
  signals: string[];
  sources: GhSource[];
  createdAt: string | null;
  topics: string[];
  /** Linked paper (HuggingFace Papers), for research repos. */
  paper: GhPaper | null;
  /** Site news items that mention this repo — "why is it hot". Newest first. */
  news: GhNews[];
  /** First time our crawler saw it (ISO). */
  firstSeen: string;
  /** One sample per Beijing day the repo was in the pool, oldest first. */
  history: { date: string; stars: number }[];
  /** One-line Chinese take (LLM, cached). */
  aiNote?: string | null;
  /** 5–8 Chinese keywords (LLM, cached) — what it is, what for, key tech. Powers Chinese search. */
  tags?: string[];
  /** Set when the repo is a playful AI use — feeds the "有趣 AI 玩法" column. */
  fun?: GhFunKind | null;
}

export interface GhTrendingSnapshot {
  fetchedAt: string;
  /** First crawl ever (ISO) — "new on the list" badges are meaningless on day one. */
  startedAt: string;
  /** Pool size per source this run (trending counts AI + non-AI repos scanned). */
  counts: { trending: number; paper: number; discover: number };
  repos: GhRepo[];
}

/** Consecutive days (ending at the latest sample) the repo has been in the pool. */
export function ghStreak(history: { date: string }[]): number {
  let n = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const expected = new Date(Date.parse(history[history.length - 1].date) - n * 86_400_000).toISOString().slice(0, 10);
    if (history[i].date !== expected) break;
    n++;
  }
  return n;
}

/** Days since creation, or null when unknown. */
export function ghAgeDays(createdAt: string | null, now: number): number | null {
  if (!createdAt) return null;
  const t = Date.parse(createdAt);
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 86_400_000));
}

/** "New project" cut-off for the badge / filter. */
export const GH_NEW_DAYS = 60;
