import { stripHtml } from "../lib/fetchUtil";
import type { GhFunKind, GhPeriod, GhTrack } from "../../lib/ghTrending";

// GitHub Trending (github.com/trending) has no API — we parse the public HTML.
// Unlike the Search API adapter (./github.ts, which only sees *new* repos by
// topic), Trending reports real star velocity: "N stars today / this week /
// this month", which is exactly the signal a hot-list needs.

/** Language slices to scan. The all-languages page alone caps at ~25 repos. */
export const TRENDING_LANGS = (
  process.env.GH_TRENDING_LANGS ?? ",python,typescript,javascript,rust,go,jupyter-notebook,shell,c++"
)
  .split(",")
  .map((s) => s.trim());

export interface TrendingRow {
  fullName: string;
  description: string | null;
  language: string | null;
  languageColor: string | null;
  stars: number;
  forks: number;
  gained: number;
  builtBy: { login: string; avatar: string }[];
}

const num = (s: string | undefined) => Number((s ?? "0").replace(/[^\d]/g, "")) || 0;

/** Parse one github.com/trending page into rows. Tolerant: skips malformed blocks. */
export function parseTrendingHtml(html: string): TrendingRow[] {
  const rows: TrendingRow[] = [];
  const blocks = html.split('<article class="Box-row').slice(1);
  for (const raw of blocks) {
    const b = raw.split("</article>")[0];
    const name = b.match(/<h2[^>]*>\s*<a[^>]*href="\/([^/"]+\/[^/"]+)"/);
    if (!name) continue;
    const fullName = name[1];
    const desc = b.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/);
    const lang = b.match(/itemprop="programmingLanguage">([^<]+)</);
    const color = b.match(/repo-language-color" style="background-color:\s*(#[0-9a-fA-F]{3,8})/);
    const stars = b.match(new RegExp(`href="/${escapeRe(fullName)}/stargazers"[\\s\\S]*?</svg>\\s*([\\d,]+)`));
    const forks = b.match(new RegExp(`href="/${escapeRe(fullName)}/forks"[\\s\\S]*?</svg>\\s*([\\d,]+)`));
    const gained = b.match(/([\d,]+)\s+stars?\s+(?:today|this week|this month)/);
    const builtBy = [...b.matchAll(/<img class="avatar[^"]*" src="([^"]+)"[^>]*alt="@([^"]+)"/g)]
      .slice(0, 5)
      .map((m) => ({ login: m[2], avatar: m[1].replace(/&amp;/g, "&") }));
    rows.push({
      fullName,
      description: desc ? stripHtml(desc[1]) || null : null,
      language: lang ? lang[1].trim() : null,
      languageColor: color ? color[1] : null,
      stars: num(stars?.[1]),
      forks: num(forks?.[1]),
      gained: num(gained?.[1]),
      builtBy,
    });
  }
  return rows;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function trendingUrl(period: GhPeriod, lang: string): string {
  const path = lang ? `/${encodeURIComponent(lang)}` : "";
  return `https://github.com/trending${path}?since=${period}`;
}

// ---------------------------------------------------------------------------
// AI relevance + track classification (keyword rules over name + description +
// topics). First matching rule wins, so order encodes precedence: a world-model
// tutorial is "world-model", an agent tutorial is "research" (learning
// material), an MCP server for coding agents is "mcp-tools", a memory layer for
// Claude Code is "agent-framework". Several rules may share a track.

/** learn: tutorial/list signal; stack: tech-stack words (not trusted from topics). */
type Rule = { track: GhTrack; re: RegExp; learn?: boolean; stack?: boolean };

/** Word-ish co-occurrence within one sentence: a … b or b … a, ≤ n chars apart. */
const near = (a: string, b: string, n = 32) =>
  `(?:\\b(?:${a})\\b[^.。]{0,${n}}\\b(?:${b})\\b|\\b(?:${b})\\b[^.。]{0,${n}}\\b(?:${a})\\b)`;

const AGENT = "agents?|agentic";

export const RULES: Rule[] = [
  {
    track: "world-model",
    // Plain "robotics" is not enough (SLAM / ROS libs trend too) — needs a learning angle.
    re: /\b(world[- ]?models?|world[- ]action models?|embodied|humanoids?|vla|vision[- ]language[- ]action|robot (?:learning|policy|policies|foundation|agents?|skills?)|robot(?:ic)? manipulation|dexterous|locomotion|sim[- ]?to[- ]?real|sim2real|physical ai|physics simulat\w*|teleoperation|jepa|lerobot|mujoco|mjlab|isaac (?:sim|lab)|world generation|video world|3d worlds?|persistent worlds?|autonomous driving|self[- ]driving)\b|世界模型|具身/i,
  },
  {
    track: "research",
    learn: true,
    re: /\b(tutorials?|courses?|lessons|curriculum|for beginners|from scratch|zero to hero|hands[- ]?on|cookbook|awesome|(?:the )?book|learn(?:ing)? (?:path|roadmap)|guide)\b|教程|课程|入门|实战|从零|学习|指南/i,
  },
  {
    track: "research",
    re: /\b(official (?:pytorch |jax )?(?:implementation|code)|code (?:for|of) (?:the |our )?paper|paper|arxiv|preprint|technical report|(?:iclr|neurips|icml|cvpr|iccv|eccv|acl|emnlp|naacl|aaai|ijcai|siggraph|corl|rss|colm)(?:['’ ]?\d{2,4})?)\b/i,
  },
  {
    track: "agent-framework",
    re: new RegExp(
      `\\b(long[- ]term memory|persistent memory|memory (?:layer|system|platform|engine|os))\\b|${near("memory", AGENT + "|llms?|ai")}`,
      "i",
    ),
  },
  {
    track: "mcp-tools",
    re: new RegExp(
      // ^[^.]* = within the repo name ("mattpocock/skills", "n8n-skills").
      `^[^.]*\\bskills?\\b|\\b(mcp|model context protocol|computer[- ]use|browser[- ]use|browser automation|tool[- ]calling|function calling|cli[- ]anything|agent tools)\\b|${near("skills?|plugins?", AGENT + "|claude|codex|cursor")}|${near("browser", AGENT)}`,
      "i",
    ),
  },
  {
    track: "coding-agent",
    re: new RegExp(
      `\\b(coding[- ]agents?|code agents?|ai (?:coding|code|pair programm\\w*)|claude[- ]code|codex|cursor|copilot|aider|ai ide|ade|vibe[- ]coding|swe[- ]?(?:bench|agent)|code review(?:er)?|terminal agent|devin|opencode|gemini[- ]cli)\\b|${near(AGENT, "code|coding|developers?|development|dev|ide|repos?")}`,
      "i",
    ),
  },
  {
    track: "infra",
    re: /\b((?:ai|llm|model) (?:gateway|router|proxy)|model router|mixture[- ]of[- ]models|inference (?:engine|server)|run (?:llms?|models?)|local llms?|on[- ]device (?:llms?|models?)|rag|graphrag|retrieval|knowledge (?:base|graph|platform)|vector (?:db|database|search|store)|embeddings?|semantic search|document pars\w+|ocr)\b/i,
  },
  {
    track: "agent-framework",
    re: new RegExp(
      `\\b(multi[- ]agent (?:framework|system|orchestration)|agents? sdk|agent (?:os|harness|runtime|platform)|manage agents|langgraph|langchain|crewai|autogen|a2a)\\b|${near(AGENT, "framework|sdk|runtime|harness|orchestration|platform")}`,
      "i",
    ),
  },
  {
    track: "infra",
    stack: true,
    re: /\b(inference|serving|vllm|sglang|llama\.cpp|gguf|quantiz\w+|fine[- ]?tun\w+|lora|training|pretrain\w*|distill\w*|reinforcement learning|rlhf|grpo|cuda kernels?|transformers?|diffusion|open[- ]weights?|foundation models?|tokeni[sz]ers?|pytorch|tensorflow|jax|mlx|llms?)\b/i,
  },
  {
    track: "research",
    re: /\b(benchmarks?|datasets?|leaderboard|evaluation suite)\b/i,
  },
];

/** Generic "this is an AI project" signal, for repos no track rule caught. */
const AI_RE =
  /\b(ai|llms?|gpt[- ]?\w*|chatgpt|claude|anthropic|openai|gemini|deepseek|qwen|llama|mistral|kimi|glm|agents?|agentic|chatbot|copilot|prompts?|genai|generative|machine learning|deep learning|neural|text[- ]to[- ](?:speech|image|video)|tts|asr|speech|voice clon\w*|stable diffusion|comfyui|ollama|hugging ?face|nlp|multimodal|vision[- ]language|computer vision|reinforcement learning)\b/i;

/** Repo *names* are noisier ("v2ray-agent") — only strong AI words count there. */
const AI_NAME_RE = /\b(ai|llms?|gpt|claude|openai|gemini|deepseek|qwen|llama|genai|mcp|rag)\b/i;

/** Orgs whose trending repos are AI by definition (even with no description). */
const AI_OWNERS = new Set(
  [
    "anthropics", "openai", "huggingface", "langchain-ai", "run-llama", "deepseek-ai", "QwenLM",
    "meta-llama", "google-deepmind", "google-gemini", "mistralai", "ollama", "vllm-project",
    "ggml-org", "crewAIInc", "fastai", "microsoft-ai", "modelcontextprotocol", "openai-agents",
  ].map((o) => o.toLowerCase()),
);

/** Research labs: their otherwise-generic repos (models, infra) count as research. */
const RESEARCH_OWNERS = new Set(
  [
    "google-research", "facebookresearch", "google-deepmind", "deepmind", "nvlabs", "tencentarc",
    "allenai", "stanfordnlp", "openbmb", "thudm", "sakanaai", "mitdeeplearning", "microsoft-research",
  ].map((o) => o.toLowerCase()),
);

export interface ClassifyInput {
  fullName: string;
  description: string | null;
  topics?: string[];
  /** Linked to a paper (HF Papers) — defaults the track to "research". */
  hasPaper?: boolean;
}

export interface Classified {
  ai: boolean;
  track: GhTrack;
  signals: string[];
}

export function classifyRepo({ fullName, description, topics = [], hasPaper = false }: ClassifyInput): Classified {
  const [owner, repo] = fullName.split("/");
  // Names / topics are kebab-cased — split so "ai-memory" / "world-models" match \b rules.
  const name = repo.replace(/[-_.]+/g, " ");
  const desc = description ?? "";
  const tags = topics.map((t) => t.replace(/-/g, " ")).join(", ");
  const core = `${name}. ${desc}`;
  const signals = new Set<string>();
  const firstHit = (text: string, fromTopics = false): Rule | null => {
    for (const r of RULES) {
      // Topics like "mlx", "cuda", "pytorch" say what a repo is built with, not what it is.
      if (fromTopics && r.stack) continue;
      const m = text.match(r.re);
      if (m) {
        signals.add(m[0].toLowerCase().replace(/\s+/g, " ").slice(0, 24));
        return r;
      }
    }
    return null;
  };
  // Name + description decide; topics are noisy (pytorch, llm, ai…) so they only
  // fill in when the text says nothing — except world-model topics, which are
  // exactly the signal the discovery queries select on.
  let hit = firstHit(core) ?? (tags ? firstHit(tags, true) : null);
  // …but a curated list / course tagged "world-models" is still a list.
  if (hit?.track !== "world-model" && !hit?.learn && tags && RULES[0].re.test(tags)) hit = RULES[0];
  let track: GhTrack = hit?.track ?? "ai-app";
  // A paper-backed or lab repo is research unless it's specifically a world model.
  if ((hasPaper || RESEARCH_OWNERS.has(owner.toLowerCase())) && track !== "world-model") {
    if (hasPaper || track === "infra" || track === "ai-app") track = "research";
  }
  const aiText = desc.match(AI_RE) ?? tags.match(AI_RE);
  const aiName = name.match(AI_NAME_RE);
  if (aiText) signals.add(aiText[0].toLowerCase());
  const ownerAi = AI_OWNERS.has(owner.toLowerCase()) || RESEARCH_OWNERS.has(owner.toLowerCase());
  // Tutorials alone aren't AI — a Go course trends too. They need an AI word.
  const aiByRule = hit !== null && !hit.learn;
  const isAi = aiByRule || hasPaper || !!aiText || !!aiName || ownerAi;
  return { ai: isAi, track, signals: [...signals].slice(0, 4) };
}

// ---------------------------------------------------------------------------
// "有趣 AI 玩法" — playful uses. Research / infra repos never count (a game
// benchmark is research), and some "fun" is off-limits for the column.

const NOT_FUN_RE = /\b(deep ?fakes?|face ?swap\w*|nsfw|nude|undress\w*|porn\w*)\b|换脸|脱衣/i;

const FUN_RULES: { kind: GhFunKind; re: RegExp }[] = [
  { kind: "game", re: /\b(games?|gaming|minecraft|pok[eé]mon|chess|rpg|npcs?|pixel[- ]art|playable|game engine)\b|游戏/i },
  { kind: "music", re: /\b(music|songs?|singing|melod(?:y|ies)|text[- ]to[- ]music|karaoke|song covers?)\b|音乐|翻唱|唱歌/i },
  { kind: "voice", re: /\b(voice clon\w*|voice (?:changer|design|conversion)|dubbing|audiobooks?|podcasts?)\b|配音|声音克隆|语音合成/i },
  { kind: "video", re: /\b(text[- ]to[- ]video|image[- ]to[- ]video|video (?:generation|clipping|editing)|render video|highlight generation|short videos?)\b|视频|剪辑/i },
  { kind: "art", re: /\b(ai art|generative art|drawing|painting|anime|comics?|manga|illustrations?|text[- ]to[- ]image|image generation|stickers?|avatar generat\w*)\b|绘画|漫画|画图/i },
  { kind: "companion", re: /\b(desktop pets?|virtual pets?|companions?|waifu|vtubers?|live2d|digital humans?|role[- ]?play\w*|ai characters?|character chat)\b|桌宠|桌面宠物|数字人|虚拟人|陪伴|陪玩|角色扮演/i },
  { kind: "story", re: /\b(storytell\w*|story generat\w*|interactive fiction|visual novels?|ai novels?|novel writing|tarot|dungeon master)\b|小说|故事|算命|塔罗/i },
  { kind: "quirky", re: /\b(fun|funny|toys?|memes?|jokes?|silly|laziest|adhd|roast\w*|living pixel|just for fun)\b|整活|好玩/i },
];

export function funKind(input: { fullName: string; description: string | null; topics?: string[]; track: GhTrack }): GhFunKind | null {
  if (input.track === "research" || input.track === "infra" || input.track === "world-model") return null;
  const name = input.fullName.split("/")[1].replace(/[-_.]+/g, " ");
  const text = `${name}. ${input.description ?? ""}. ${(input.topics ?? []).map((t) => t.replace(/-/g, " ")).join(", ")}`;
  if (NOT_FUN_RE.test(text)) return null;
  return FUN_RULES.find((r) => r.re.test(text))?.kind ?? null;
}
