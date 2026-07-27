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

一个**零服务器、零数据库**的 AI 行业资讯聚合站。GitHub Actions 每天自动从 40+ 公开来源抓取最新资讯，AI 生成一句话点评，静态部署到 GitHub Pages——访客不需要登录、不需要 API Key、没有任何成本。

### 能做什么

|  | 能力 | 说明 |
|:---:|------|------|
| 📰 | **每日自动更新** | 40+ 源并行抓取，智能去重分类，每天自动重建部署 |
| 🤖 | **AI 解读** | 每条资讯一句话 AI 点评 + 每日必读精选 + 周报 AI 总结 |
| 📊 | **6 种视角** | 首页瀑布流 / 日报 / 周报 / 趋势图 / 话题聚合 / 时间线 |
| 📈 | **交互式趋势** | 纯 SVG 折线图，hover 看数值，分类 / 话题筛选面板 |
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
3. *(可选)* 添加 Secret `DEEPSEEK_API_KEY` 启用 AI 点评
4. Actions 里跑一次 **Build & Deploy**
5. 访问 `https://<你的用户名>.github.io/AI-Search/`

**本地开发**

```bash
git clone https://github.com/Jackychen-12/AI-Search.git
cd AI-Search && npm install
npm run crawl && npm run dev
```

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

</details>

---

<details>
<summary><h2>English</h2></summary>

> "AI moves too fast. By the time I catch up, it's already old news."

A **zero-server, zero-database** AI industry news aggregator. GitHub Actions automatically crawls 40+ public sources daily, generates AI commentary, and deploys to GitHub Pages — no login, no API key, zero cost for visitors.

### Features

|  | Feature | Description |
|:---:|---------|-------------|
| 📰 | **Daily Auto-Update** | 40+ sources crawled in parallel, smart dedup & classification |
| 🤖 | **AI Commentary** | One-line AI review per article + daily picks + weekly AI summary |
| 📊 | **6 Views** | Feed / Daily / Weekly / Trends / Topics / Timeline |
| 📈 | **Interactive Trends** | Pure SVG charts, hover values, category & topic filtering |
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
3. *(Optional)* Add Secret `DEEPSEEK_API_KEY` for AI features
4. Run **Build & Deploy** in Actions
5. Visit `https://<your-username>.github.io/AI-Search/`

**Local Development**

```bash
git clone https://github.com/Jackychen-12/AI-Search.git
cd AI-Search && npm install
npm run crawl && npm run dev
```

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
| `app/` | Page routes — home, daily, weekly, trends, topics, timeline |
| `components/` | 30+ React components |
| `lib/` | Core logic — types, filtering, i18n, trends, weekly reports |
| `scripts/` | Build scripts — crawl orchestration, source adapters, API generation |
| `data/` | Data snapshots — items + meta + digest + monthly archives |
| `tests/` | Unit tests — Vitest |
| `public/` | Static assets — OG image, SW, SKILL.md, install script |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DEEPSEEK_API_KEY` | AI commentary (optional — everything else works without it) |
| `NEXT_PUBLIC_ASK_AI_URL` | AI Q&A proxy (see `worker/`) |
| `NEXT_PUBLIC_GISCUS_REPO` / `_REPO_ID` / `_CATEGORY_ID` | giscus comments (optional; set all three to your own repo) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO/sitemap (set this on forks) |

## License

[MIT](LICENSE)
