import { describe, expect, it } from "vitest";
import { classifyRepo, funKind, parseTrendingHtml } from "../scripts/sources/githubTrending";
import { matchNews } from "../scripts/lib/ghNews";
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
    expect(track("Eurekaleo/awesome-ai-for-games", "A curated collection of research on AI for games", { topics: ["world-models"] }).track).toBe("research");
    // Plain robotics libraries are not "AI world models".
    expect(track("borglab/gtsam", "smoothing and mapping (SAM) in robotics and vision").ai).toBe(false);
  });

  it("routes papers, labs and courses to research", () => {
    expect(track("microsoft/SkillOpt", "A text-space optimizer for agent skills", { hasPaper: true }).track).toBe("research");
    expect(track("Westlake-AGI-Lab/WorldinWorld", "Official implementation of WorldinWorld", { hasPaper: true, topics: ["world-model"] }).track).toBe("world-model");
    expect(track("google-research/timesfm", "TimesFM is a pretrained time-series foundation model").track).toBe("research");
    expect(track("x/y", "Official implementation of our NeurIPS 2026 paper on LLM routing").track).toBe("research");
    expect(track("microsoft/ai-agents-for-beginners", "18 Lessons to Get Started Building AI Agents").track).toBe("research");
  });

  it("keeps non-AI repos out", () => {
    expect(track("mack-a/v2ray-agent", "Xray、Tuic、hysteria2、sing-box 八合一一键脚本").ai).toBe(false);
    expect(track("vercel/next.js", "The React Framework").ai).toBe(false);
    expect(track("hydra-db/hydradb", "HydraDB - fast graph database on object storage").ai).toBe(false);
    expect(track("golang/go", "The Go programming language").ai).toBe(false);
    expect(track("microsoft/IoT-For-Beginners", "12 Weeks, 24 Lessons, IoT for All!").ai).toBe(false);
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
