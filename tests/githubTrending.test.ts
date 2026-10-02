import { describe, expect, it } from "vitest";
import { classifyRepo, funKind, parseTrendingHtml } from "../scripts/sources/githubTrending";
import { matchNews } from "../scripts/lib/ghNews";
import { cleanNote, parseTags } from "../scripts/lib/ghNote";
import { ghWideKeywords, ghWideQuery, parseGhQuery, rankWideResults, searchGhRepos } from "../lib/ghSearch";
import type { GhRepo } from "../lib/ghTrending";
import { ghStreak } from "../lib/ghTrending";
import type { AIItem } from "../lib/types";

// Trimmed from a real github.com/trending?since=weekly response.
const HTML = `
<article class="Box-row">
  <h2 class="h3 lh-condensed">
    <a data-hydro-click="{}" href="/vectorize-io/hindsight" class="Link">
      <span class="text-normal">vectorize-io /</span> hindsight</a>
  </h2>
  <p class="col-9 color-fg-muted my-1 tmp-pr-4">
    Hindsight: Agent Memory That Learns &amp; Remembers
  </p>
  <div class="f6 color-fg-muted mt-2">
    <span class="repo-language-color" style="background-color: #3572A5"></span>
    <span itemprop="programmingLanguage">Python</span>
    <a href="/vectorize-io/hindsight/stargazers" class="Link"><svg class="octicon octicon-star"><path d=""></path></svg>
      41,203</a>
    <a href="/vectorize-io/hindsight/forks" class="Link"><svg class="octicon octicon-repo-forked"><path d=""></path></svg>
      5,555</a>
    <span>Built by
      <a href="/alice"><img class="avatar mb-1 avatar-user" src="https://avatars.githubusercontent.com/u/1?s=40&amp;v=4" width="20" height="20" alt="@alice" /></a>
    </span>
    <span class="d-inline-block float-sm-right"><svg></svg>
      15,537 stars this week
    </span>
  </div>
</article>
<article class="Box-row">
  <h2 class="h3 lh-condensed"><a href="/anthropics/financial-services" class="Link">anthropics / financial-services</a></h2>
  <div class="f6 color-fg-muted mt-2">
    <a href="/anthropics/financial-services/stargazers"><svg></svg> 38,088</a>
    <span class="d-inline-block float-sm-right"><svg></svg> 1 star today</span>
  </div>
</article>`;

describe("parseTrendingHtml", () => {
  it("extracts repo, stats, gain and contributors", () => {
    const [r, bare] = parseTrendingHtml(HTML);
    expect(r).toMatchObject({
      fullName: "vectorize-io/hindsight",
      description: "Hindsight: Agent Memory That Learns & Remembers",
      language: "Python",
      languageColor: "#3572A5",
      stars: 41203,
      forks: 5555,
      gained: 15537,
    });
    expect(r.builtBy).toEqual([{ login: "alice", avatar: "https://avatars.githubusercontent.com/u/1?s=40&v=4" }]);
    // Missing description / language / forks are tolerated.
    expect(bare).toMatchObject({ fullName: "anthropics/financial-services", description: null, stars: 38088, gained: 1 });
  });
});

describe("classifyRepo", () => {
  const track = (fullName: string, description: string | null, extra: { topics?: string[]; hasPaper?: boolean } = {}) =>
    classifyRepo({ fullName, description, ...extra });

  it("puts repos in the expected track", () => {
    expect(track("paperclipai/paperclip", "The open-source app everyone uses to manage agents at work").track).toBe("agent-framework");
    expect(track("google/ax", "Google's open agentic orchestration runtime").track).toBe("agent-framework");
    expect(track("vectorize-io/hindsight", "Hindsight: Agent Memory That Learns").track).toBe("agent-framework");
    expect(track("anthropics/claude-code", "Claude Code is an agentic coding tool that lives in your terminal").track).toBe("coding-agent");
    expect(track("mobile-next/mobile-mcp", "Model Context Protocol Server for Mobile Automation").track).toBe("mcp-tools");
    expect(track("mattpocock/skills", "Skills for Real Engineers. Straight from my .agents directory.").track).toBe("mcp-tools");
    expect(track("ggml-org/llama.cpp", "LLM inference in C/C++").track).toBe("infra");
    expect(track("maximhq/bifrost", "Fastest enterprise AI gateway").track).toBe("infra");
    expect(track("Tencent/WeKnora", "Open-source LLM knowledge platform: turn raw documents into a queryable RAG").track).toBe("infra");
    expect(track("debpalash/VoiceStudio", "fully-local ElevenLabs alternative — voice cloning", { topics: ["ai", "cuda", "mlx"] }).track).toBe("ai-app");
  });

  it("recognises world models and embodied AI", () => {
    expect(track("TencentARC/WorldCrafter", "Consistent Video World Model with Implicit 3D").track).toBe("world-model");
    expect(track("shengshu-ai/Motus2", "A Self-Evolving General World Model for Dexterous Manipulation").track).toBe("world-model");
    expect(track("x/y", "Post-training trackers", { topics: ["humanoid", "reinforcement-learning"] }).track).toBe("world-model");
    expect(track("Eurekaleo/awesome-ai-for-games", "A curated collection of research on AI for games", { topics: ["world-models"] }).track).toBe("learn");
    // Plain robotics libraries are not "AI world models".
    expect(track("borglab/gtsam", "smoothing and mapping (SAM) in robotics and vision").ai).toBe(false);
  });

  it("routes papers and labs to research, courses to learn", () => {
    expect(track("microsoft/SkillOpt", "A text-space optimizer for agent skills", { hasPaper: true }).track).toBe("research");
    expect(track("Westlake-AGI-Lab/WorldinWorld", "Official implementation of WorldinWorld", { hasPaper: true, topics: ["world-model"] }).track).toBe("world-model");
    expect(track("google-research/timesfm", "TimesFM is a pretrained time-series foundation model").track).toBe("research");
    expect(track("x/y", "Official implementation of our NeurIPS 2026 paper on LLM routing").track).toBe("research");
    expect(track("microsoft/ai-agents-for-beginners", "18 Lessons to Get Started Building AI Agents").track).toBe("learn");
    expect(track("microsoft/ML-For-Beginners", "12 weeks, 26 lessons, 52 quizzes, classic Machine Learning for all").track).toBe("learn");
  });

  it("keeps non-AI repos out", () => {
    expect(track("mack-a/v2ray-agent", "Xray、Tuic、hysteria2、sing-box 八合一一键脚本").ai).toBe(false);
    expect(track("vercel/next.js", "The React Framework").ai).toBe(false);
    expect(track("hydra-db/hydradb", "HydraDB - fast graph database on object storage").ai).toBe(false);
    expect(track("golang/go", "The Go programming language").ai).toBe(false);
    expect(track("microsoft/IoT-For-Beginners", "12 Weeks, 24 Lessons, IoT for All!").ai).toBe(false);
    // AI only mentioned in a tag cloud deep in the description of a life-advice guide.
    expect(
      track("byoungd/up", "An advanced guide which might benefit you a lot 🎉 . 韩先凯的人生进阶指南 人生进阶指南 离谱的人生 人生进阶 AI学习 AI指南 韩先凯的AI学习指南 英语学习指南").ai,
    ).toBe(false);
    // Offline knowledge server; AI is an optional extra, not what the project is.
    expect(
      track(
        "Crosstalk-Solutions/project-nomad",
        "Project NOMAD is an offline-first knowledge and education server. Wikipedia, thousands of books, courses, maps, and optional local AI, all running on hardware you own with no internet required.",
      ).ai,
    ).toBe(false);
  });

  it("trusts known AI orgs even without a description", () => {
    expect(track("anthropics/financial-services", null).ai).toBe(true);
  });
});

describe("matchNews", () => {
  const now = Date.parse("2026-09-29T00:00:00Z");
  const item = (id: string, title: string, sourceUrl = "https://example.com/" + id, extra: Partial<AIItem> = {}): AIItem => ({
    id,
    title,
    summary: null,
    source: "Test",
    sourceUrl,
    category: null,
    publishedAt: "2026-09-25T00:00:00Z",
    ...extra,
  });
  const repos = [
    { fullName: "paperclipai/paperclip" },
    { fullName: "debpalash/VoiceStudio" },
    { fullName: "google/ax" },
    { fullName: "google-research/google-research" },
  ];

  it("matches direct links, owner+name and distinctive names — nothing else", () => {
    const m = matchNews(
      repos,
      [
        item("hn", "Show HN: my agent manager", "https://github.com/paperclipai/paperclip"),
        item("both", "Paperclip AI ships paperclip 2.0 for agent teams"),
        item("maximizer", "The paperclip maximizer, revisited"), // common word, no owner → no match
        item("vs", "VoiceStudio is a local ElevenLabs rival"),
        item("ax", "Google open-sources Ax"), // generic 2-letter name → only links count
        item("old", "Show HN", "https://github.com/google/ax", { publishedAt: "2026-06-01T00:00:00Z" }), // too old
        item("self", "google/ax", "https://github.com/google/ax", { origin: "github" }), // repo entry, not news
        item("mono", "Google Research unveils a weather model"), // monorepo google-research/google-research
      ],
      now,
    );
    expect(m.get("paperclipai/paperclip")?.map((n) => n.id).sort()).toEqual(["both", "hn"]);
    expect(m.get("debpalash/voicestudio")?.map((n) => n.id)).toEqual(["vs"]);
    expect(m.has("google/ax")).toBe(false);
    expect(m.has("google-research/google-research")).toBe(false);
  });
});

describe("ghStreak", () => {
  it("counts consecutive days ending at the latest sample", () => {
    expect(ghStreak([{ date: "2026-09-25" }, { date: "2026-09-27" }, { date: "2026-09-28" }, { date: "2026-09-29" }])).toBe(3);
    expect(ghStreak([{ date: "2026-09-29" }])).toBe(1);
    expect(ghStreak([])).toBe(0);
  });
});

describe("funKind", () => {
  const fun = (fullName: string, description: string, track: Parameters<typeof funKind>[0]["track"] = "ai-app", topics: string[] = []) =>
    funKind({ fullName, description, topics, track });

  it("tags playful AI uses", () => {
    expect(fun("timoncool/YuE2-Studio", "Local AI song generator with an editable score")).toBe("music");
    expect(fun("leemysw/yovoice", "Open-source voice creation. Local TTS, voice cloning")).toBe("voice");
    expect(fun("liupig/xiaokeai", "开源免费的本地 3D 陪玩：桌面 3D 角色语音聊天")).toBe("companion");
    expect(fun("x/y", "A cute desk buddy", "ai-app", ["desktop-pet"])).toBe("companion");
    expect(fun("androoAGI/starnet", "A living pixel-art station where real AI agents do real work", "agent-framework")).toBe("game");
  });

  it("leaves serious or off-limits repos out", () => {
    expect(fun("k2-fsa/sherpa-onnx", "Speech-to-text, text-to-speech, speaker diarization")).toBeNull(); // a toolkit, not a toy
    expect(fun("TencentARC/WorldCrafter", "Consistent Video World Model", "world-model", ["video-generation"])).toBeNull();
    expect(fun("TencentARC/GameHorizon", "Multi-horizon data and evaluation in games", "research")).toBeNull();
    expect(fun("x/faceswap-studio", "Real-time face swap for video calls")).toBeNull();
  });
});

describe("cleanNote", () => {
  it("strips trailing boilerplate", () => {
    expect(cleanNote("跨平台桌面助手，一站式管理多种AI编程代理，用Rust构建，值得关注。")).toBe("跨平台桌面助手，一站式管理多种AI编程代理，用Rust构建。");
    expect(cleanNote("面向工程师的实用技能集合，源自作者日常代理配置，值得关注因其可直接复用。")).toBe("面向工程师的实用技能集合，源自作者日常代理配置。");
    expect(cleanNote("让AI代理像最懒的资深开发者一样思考，少写代码。值得关注，因为它用极简哲学对抗过度工程。")).toBe("让AI代理像最懒的资深开发者一样思考，少写代码。");
  });

  it("drops notes cut off mid-sentence so they get regenerated", () => {
    expect(cleanNote("一站式办公文档运行时，为 AI 智能体提供操作办公套件的底")).toBeNull();
    expect(cleanNote(null)).toBeNull();
  });

  it("catches 值得…关注 variants", () => {
    expect(cleanNote("从零手写AI工程全流程的实战教程，值得想深入理解底层原理的开发者关注。")).toBe("从零手写AI工程全流程的实战教程。");
  });

  it("repairs fresh model output instead of dropping it", () => {
    expect(cleanNote("开源的多智能体协作管理工具，让团队统一调度AI代理", true)).toBe("开源的多智能体协作管理工具，让团队统一调度AI代理。");
    const long = "一站式办公文档运行时，把表格、文档、幻灯片、画布、关系表和 PDF 统一进同一引擎，为 AI 智能体提供操作办公套件的底层能力，并且支持协同编辑与插件扩展";
    const out = cleanNote(long, true)!;
    expect(out.length).toBeLessThanOrEqual(70);
    expect(out.endsWith("底层能力。")).toBe(true);
  });

  it("keeps clean notes as they are", () => {
    const ok = "本地运行的语音克隆与配音工具，支持646种语言，可替代ElevenLabs。";
    expect(cleanNote(ok)).toBe(ok);
  });
});

describe("GitHub trends search", () => {
  const repo = (fullName: string, description: string, aiNote: string | null = null, extra: Partial<GhRepo> = {}): GhRepo => ({
    fullName,
    url: `https://github.com/${fullName}`,
    description,
    language: null,
    languageColor: null,
    stars: 100,
    forks: 1,
    gained: { weekly: 10 },
    track: "ai-app",
    signals: [],
    sources: ["trending"],
    createdAt: null,
    topics: [],
    paper: null,
    news: [],
    firstSeen: "2026-10-01T00:00:00Z",
    history: [],
    aiNote,
    ...extra,
  });
  const repos = [
    repo("pbakaus/impeccable", "The design language that makes your AI harness better at design.", "一套让 AI 工具更懂设计的提示语言规范。"),
    repo("Leonxlnx/taste-skill", "Gives your AI good taste: stops generic UI and frontend slop.", "给AI注入审美判断力。", { topics: ["design", "ui"] }),
    repo("heygen-com/hyperframes", "Write HTML. Render video. Built for agents.", "用HTML写视频脚本，专为AI智能体设计。"),
    repo("pydantic/monty", "A minimal Python interpreter designed for use by AI.", null),
    repo("debpalash/VoiceStudio", "Local ElevenLabs alternative — voice cloning, dubbing.", "本地运行的语音克隆与配音工具。"),
    repo("browser-use/browser-use", "Make websites accessible for AI agents. Automate tasks online.", "让AI代理直接操控浏览器完成网页任务。"),
    repo("jo-inc/camofox-browser", "Stealth headless browser for AI agents", "为 AI 智能体设计的隐身无头浏览器，可绕过反爬检测。", {
      topics: ["anti-bot", "browser", "ai-agents"],
      tags: ["无头浏览器", "反爬虫", "指纹伪装"],
    }),
  ];
  const names = (q: string) => searchGhRepos(repos, parseGhQuery(q)).map((h) => h.repo.fullName);

  it("reduces a natural-language query to concepts", () => {
    const q = parseGhQuery("我希望搜索github上跟优化ai设计ui相关的项目");
    expect(q.groups.map((g) => g.terms[0])).toEqual(["优化", "设计", "界面"]);
    expect(q.groups[0].soft).toBe(true);
    expect(parseGhQuery("AI 项目").groups).toEqual([]);
    expect(parseGhQuery("本地跑大模型").groups.map((g) => g.terms[0])).toEqual(["本地", "大模型"]);
  });

  it("matches across Chinese and English", () => {
    expect(names("优化ai设计ui相关的项目")).toEqual(["Leonxlnx/taste-skill", "pbakaus/impeccable"]);
    expect(names("语音克隆")).toEqual(["debpalash/VoiceStudio"]);
    expect(names("voice cloning")).toEqual(["debpalash/VoiceStudio"]);
    expect(names("浏览器自动化")[0]).toBe("browser-use/browser-use");
  });

  it("matches words outside the dictionary as 2-character grams, and the LLM keywords", () => {
    const q = parseGhQuery("隐身浏览器");
    expect(q.groups.map((g) => g.terms[0])).toEqual(["隐身", "浏览器"]);
    expect(q.groups[0].phrase).toBe("隐身");
    expect(names("隐身浏览器")[0]).toBe("jo-inc/camofox-browser");
    expect(names("指纹伪装")).toEqual(["jo-inc/camofox-browser"]); // only in `tags`
  });

  it("returns nothing rather than near-misses when a named concept matches no repo", () => {
    expect(names("浏览器翻译")).toEqual([]); // browsers yes, translation nowhere
  });

  it("does not treat 为…设计 / designed for as design", () => {
    expect(names("设计")).not.toContain("heygen-com/hyperframes");
    expect(names("design")).not.toContain("pydantic/monty");
  });

  it("builds an English, AI-scoped query for GitHub's search", () => {
    const q = ghWideQuery(parseGhQuery("优化ai设计ui相关的项目"), Date.parse("2026-10-01T00:00:00Z"));
    expect(q).toBe("design ui ai in:name,description,topics stars:>100 pushed:>2026-04-04");
    expect(ghWideQuery(parseGhQuery("agent 记忆"), 0)).toMatch(/^agent memory in:/);
    expect(ghWideQuery(parseGhQuery("AI 项目"), 0)).toBeNull();
  });

  it("finds an English keyword for unknown Chinese words from matching repos' topics", () => {
    expect(ghWideKeywords(parseGhQuery("隐身浏览器"), repos)).toEqual(["browser", "anti", "bot"]);
    // Nothing tracked matches → the Chinese phrase itself is all we have.
    expect(ghWideKeywords(parseGhQuery("剪纸"), repos)).toEqual(["剪纸"]);
  });

  it("re-checks GitHub's results with the stricter matching", () => {
    const q = parseGhQuery("设计 ui");
    const ranked = rankWideResults(
      [
        { fullName: "firerpa/lamda", description: "Device control platform with UI automation, designed for clusters", stars: 9000 },
        { fullName: "onlook-dev/onlook", description: "The developer tool for designers. Visually edit your UI.", stars: 500 },
        { fullName: "acme/ui-design-kit", description: "AI design system", topics: ["ui"], stars: 100 },
      ],
      q,
    ).map((r) => r.fullName);
    expect(ranked).toEqual(["acme/ui-design-kit", "onlook-dev/onlook"]); // "designed for" is not design; name match first
  });
});

describe("parseTags", () => {
  it("reads keywords per repo and drops junk", () => {
    const raw = '```json\n{"Owner/Repo": ["界面设计", "人工智能", "界面设计", "x", "RAG", 42], "other/missing": "oops"}\n```';
    const tags = parseTags(raw, ["owner/repo", "other/missing", "not/there"]);
    expect(tags.get("owner/repo")).toEqual(["界面设计", "RAG"]);
    expect(tags.has("other/missing")).toBe(false);
    expect(parseTags("not json", ["owner/repo"]).size).toBe(0);
  });
});
