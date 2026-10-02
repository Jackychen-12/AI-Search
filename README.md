<h1 align="center">🔍 AI Search</h1>

<p align="center">
  <strong>每天自动聚合全网 AI 资讯 · AI 解读 · 个性化 · 开放 API</strong><br/>
  <strong>Auto-aggregate AI news daily · AI commentary · Personalization · Open API</strong><br/>
  <sub>零服务器 · 零数据库 · Fork 即用 · 内容换源变成任何领域的资讯站</sub>
</p>

<p align="center">
  <a href="https://aisearches.cc/"><img src="https://img.shields.io/badge/🌐_在线体验_Live_Demo-aisearches.cc-2ea44f?style=for-the-badge" alt="Live Demo" /></a>
</p>

<p align="center">
  <a href="https://github.com/Jackychen-12/AI-Search/actions"><img src="https://github.com/Jackychen-12/AI-Search/actions/workflows/deploy.yml/badge.svg" alt="Build & Deploy" /></a>
  <a href="https://github.com/Jackychen-12/AI-Search/stargazers"><img src="https://img.shields.io/github/stars/Jackychen-12/AI-Search?style=flat&logo=github&color=yellow" alt="Stars" /></a>
  <a href="https://github.com/Jackychen-12/AI-Search/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Jackychen-12/AI-Search" alt="License" /></a>
  <img src="https://img.shields.io/badge/sources-40+-blue" alt="40+ Sources" />
  <img src="https://img.shields.io/badge/cost-$0-green" alt="Zero Cost" />
</p>

---

<details open>
<summary><h2>中文</h2></summary>

> "AI 圈一天发太多东西，等我反应过来已经过气了。"

一个**零服务器、零数据库**的 AI 行业资讯聚合站。GitHub Actions 每天自动从 40+ 公开来源抓取最新资讯，AI 生成一句话点评，静态部署到 GitHub Pages——访客不需要登录、不需要 API Key、没有任何成本。另有 **GitHub AI 趋势**页，每天追踪 AI 开源项目的 Star 增速。

### 能做什么

|  | 能力 | 说明 |
|:---:|------|------|
| 📰 | **每日自动更新** | 40+ 源并行抓取，智能去重分类，每天自动重建部署 |
| 🤖 | **AI 解读** | 每条资讯一句话 AI 点评 + 每日必读精选 + 周报 AI 总结 |
| 📊 | **7 种视角** | 首页瀑布流 / 日报 / 周报 / 趋势图 / 话题聚合 / 时间线 / GitHub 趋势 |
| 📈 | **交互式趋势** | 纯 SVG 折线图，hover 看数值，分类 / 话题筛选面板 |
| 🐙 | **GitHub AI 趋势** | 每日汇总 GitHub Trending、HuggingFace 热门论文代码与世界模型 / 具身 / 有趣 AI 新项目，分 8 个赛道；今日 / 本周 / 本月新增 Star、增速对比、相关论文与报道，筛选结果可通过链接分享 |
| ⭐ | **个性化** | 关注 / 屏蔽来源 · 收藏 · 已读 · 导出，全存浏览器本地 |
| 🔍 | **全文搜索** | MiniSearch 模糊搜索 + ⌘K 命令面板 + 搜索历史 |
| 🌙 | **暗色模式** | 跟随系统偏好自动切换 |
| 🌐 | **中英文** | 全站 80+ 条 UI 文案一键切换 |
| 📱 | **PWA** | 移动端适配 + 可安装到手机主屏 |
| 🔌 | **开放 API** | 静态 JSON 端点 + SKILL.md，Agent 可用自然语言获取数据 |
| 🔄 | **一键换源** | 改一个数组 → 金融 / 医疗 / Web3 / 芯片资讯站 |

### 快速开始

**Fork 部署（5 分钟，零代码）**

1. 点右上角 **Fork**
2. Settings → Pages → Source 选 **GitHub Actions**
3. *(可选)* 添加 Secret `DEEPSEEK_API_KEY` 启用 AI 点评（资讯点评与 GitHub 项目的一句话解读）
4. Actions 里跑一次 **Build & Deploy**
5. 访问 `https://<你的用户名>.github.io/AI-Search/`

**本地开发**

```bash
git clone https://github.com/Jackychen-12/AI-Search.git
cd AI-Search && npm install
npm run crawl          # 抓取资讯（末尾会顺带更新 GitHub 趋势）
npm run crawl:github   # 只更新 GitHub 趋势
npm run dev
```

> 本机通过 HTTP 代理上网时，Node 的 `fetch` 默认不读取 `HTTPS_PROXY`，抓取会失败；可在命令前加 `NODE_USE_ENV_PROXY=1`（Node 22.21+ / 24.5+）。

### GitHub AI 趋势

访问 `/github`，每天追踪与 AI 应用、Agent 直接相关的开源项目。

- **数据来源**：GitHub Trending（今日 / 本周 / 本月 × 9 个语言分区）、HuggingFace 热门论文的代码仓库、GitHub 搜索发现的新建世界模型 / 具身 / 有趣 AI 项目
- **新增 Star**：Trending 项目直接用 GitHub 给出的数字；其他项目只在能精确计算时显示（仓库建于统计窗口内、stargazer 时间戳、或与每日快照对比），**不做估算**
- **8 个赛道**：Agent 框架、编程 Agent、MCP · Skills、AI 应用、世界模型 · 具身、学术研究、模型 · 基建、教程 · 资源，由 `scripts/sources/githubTrending.ts` 中的关键词规则判定
- **有趣玩法**：游戏、音乐、声音、桌宠陪伴等好玩的用法，作为筛选开关，可与任意赛道叠加
- **为什么火**：自动关联本站资讯库中提到该仓库的报道，以及 HuggingFace 上的对应论文
- **搜索**：支持自然语言和中英文互通，输入「AI 设计 UI」「语音克隆」即可在榜单内按相关度筛选；回车可继续搜索 GitHub 全站（榜单之外、按 Star 排序）
- **分享链接**：筛选和搜索词会写进网址，如 `/github/?track=agent-framework&period=monthly&new=1&fun=1&q=语音克隆`

### Agent 接入（一行命令）

```bash
curl -fsSL https://aisearches.cc/install.sh | bash
```

然后问你的 Agent："今天 AI 圈有什么新东西"、"最近 OpenAI 有什么发布"、"看下 AI 论文"。

也可以直接调 JSON API（无需 Key）：

```bash
curl .../api/v1/daily/latest.json       # 最新日报
curl .../api/v1/items.json              # 全量资讯
curl .../api/v1/category/ai-models.json # 按分类
curl .../api/v1/github-trending.json    # GitHub AI 趋势
```

### 换源 — 变成任何领域的资讯站

编辑 `scripts/sources/rss.ts` 替换 FEEDS 数组 + `lib/categories.ts` 换分类 → `npm run crawl && npm run dev`。5 分钟变成金融 / 医疗 / 芯片资讯站。

### 数据来源（40+）

| 类别 | 来源 |
|------|------|
| 模型实验室 | OpenAI · Anthropic · Google AI / DeepMind · Meta AI · Mistral · Qwen · NVIDIA · HuggingFace |
| 学术深度 | arXiv · HF Papers · Google Research · Apple ML · Microsoft Research · BAIR · Lil'Log · Ahead of AI |
| 科技媒体 | The Verge · TechCrunch · VentureBeat · Ars Technica · MIT Tech Review · Wired · The Decoder · SemiAnalysis |
| Newsletter / 社区 | AI News（smol.ai，X/Reddit 热议回顾）· TLDR AI · Import AI · Interconnects · Latent Space · Ben's Bites · Hacker News · GitHub Trending · Simon Willison · Ethan Mollick |
| 中文 | 机器之心 · 量子位 · 新智元 · 极客公园（公众号经 wechat2rss）· 36氪 · IT之家 · 少数派 · InfoQ |
| GitHub 趋势 | GitHub Trending · HuggingFace 热门论文代码 · GitHub 搜索（世界模型 / 具身 / 有趣 AI 新项目）|

</details>

---

<details>
<summary><h2>English</h2></summary>

> "AI moves too fast. By the time I catch up, it's already old news."

A **zero-server, zero-database** AI industry news aggregator. GitHub Actions automatically crawls 40+ public sources daily, generates AI commentary, and deploys to GitHub Pages — no login, no API key, zero cost for visitors. A **GitHub AI Trending** page tracks the star momentum of AI open-source projects every day.

### Features

|  | Feature | Description |
|:---:|---------|-------------|
| 📰 | **Daily Auto-Update** | 40+ sources crawled in parallel, smart dedup & classification |
| 🤖 | **AI Commentary** | One-line AI review per article + daily picks + weekly AI summary |
| 📊 | **7 Views** | Feed / Daily / Weekly / Trends / Topics / Timeline / GitHub Trending |
| 📈 | **Interactive Trends** | Pure SVG charts, hover values, category & topic filtering |
| 🐙 | **GitHub AI Trending** | Daily GitHub Trending, trending HuggingFace paper code and new world-model / embodied / fun AI repos in 8 tracks — stars gained today / this week / this month, momentum, related papers & news, shareable filter links |
| ⭐ | **Personalization** | Follow/block sources · bookmarks · read status · export, all in localStorage |
| 🔍 | **Full-Text Search** | MiniSearch fuzzy search + ⌘K command palette |
| 🌙 | **Dark Mode** | Auto-follows system preference |
| 🌐 | **i18n** | Chinese / English toggle for all 80+ UI strings |
| 📱 | **PWA** | Mobile-responsive + installable to home screen |
| 🔌 | **Open API** | Static JSON endpoints + SKILL.md for Agent integration |
| 🔄 | **Swap Sources** | Change one array → finance / healthcare / Web3 / chip news site |

### Quick Start

**Fork & Deploy (5 min, zero code)**

1. Click **Fork**
2. Settings → Pages → Source → **GitHub Actions**
3. *(Optional)* Add Secret `DEEPSEEK_API_KEY` for AI features (news commentary and one-line takes on GitHub repos)
4. Run **Build & Deploy** in Actions
5. Visit `https://<your-username>.github.io/AI-Search/`

**Local Development**

```bash
git clone https://github.com/Jackychen-12/AI-Search.git
cd AI-Search && npm install
npm run crawl          # crawl news (also refreshes GitHub trends at the end)
npm run crawl:github   # refresh GitHub trends only
npm run dev
```

> Behind an HTTP proxy? Node's `fetch` ignores `HTTPS_PROXY` by default — prefix commands with `NODE_USE_ENV_PROXY=1` (Node 22.21+ / 24.5+).

### GitHub AI Trending

Visit `/github` for a daily view of open-source projects directly about AI apps and agents.

- **Sources**: GitHub Trending (today / week / month × 9 language slices), code repos of trending HuggingFace papers, and newly created world-model / embodied / fun AI repos found via GitHub search
- **Stars gained**: GitHub's own numbers for Trending repos; for other repos only when exact (created inside the window, stargazer timestamps, or diff against the daily snapshot) — **never estimated**
- **8 tracks**: Agent Frameworks, Coding Agents, MCP · Skills, AI Apps, World Models · Embodied, Research, Models · Infra, Learn — assigned by keyword rules in `scripts/sources/githubTrending.ts`
- **Fun**: games, music, voice, desk pets and other playful uses — a filter you can combine with any track
- **Why it's hot**: links each repo to this site's own news that mentions it, plus its HuggingFace paper
- **Search**: natural-language, Chinese ⇄ English concept matching ("AI design UI", "语音克隆") ranks the tracked repos by relevance; press Enter to also search all of GitHub (beyond this list, sorted by stars)
- **Shareable links**: filters and the search text live in the URL, e.g. `/github/?track=agent-framework&period=monthly&new=1&fun=1&q=voice+cloning`

### Agent Integration (one command)

```bash
curl -fsSL https://aisearches.cc/install.sh | bash
```

Then ask your Agent: "What's new in AI today", "Latest OpenAI releases", "Show me AI papers".

### Swap Sources

Edit `scripts/sources/rss.ts` to replace FEEDS + `lib/categories.ts` for categories → `npm run crawl && npm run dev`. 5 minutes to a finance / healthcare / chip news site.

</details>

---

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `app/` | Page routes — home, daily, weekly, trends, topics, timeline, github |
| `components/` | 30+ React components |
| `lib/` | Core logic — types, filtering, i18n, trends, weekly reports, GitHub trends tracks |
| `scripts/` | Build scripts — crawl orchestration, source adapters, GitHub trends crawler (`crawlGithub.ts`), API generation |
| `data/` | Data snapshots — items + meta + digest + monthly archives + `github-trending.json` |
| `tests/` | Unit tests — Vitest |
| `public/` | Static assets — OG image, SW, SKILL.md, install script |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DEEPSEEK_API_KEY` | AI commentary for news and GitHub repos (optional — everything else works without it) |
| `GITHUB_TOKEN` | GitHub API token: higher rate limits for the crawlers; the stargazers API (exact daily / weekly stars for non-Trending repos) requires one. Provided automatically in GitHub Actions |
| `GH_TRENDING_LANGS` / `GH_NOTE_MAX` / `GH_STAR_BUDGET` | GitHub trends tuning (optional): Trending language slices, AI takes per run (default 40), stargazer API call budget |
| `NEXT_PUBLIC_ASK_AI_URL` | AI Q&A proxy (see `worker/`) |
| `NEXT_PUBLIC_GISCUS_REPO` / `_REPO_ID` / `_CATEGORY_ID` | giscus comments (optional; set all three to your own repo) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO/sitemap (set this on forks) |

## License

[MIT](LICENSE)
