# AI Search Skill

> "AI 圈一天发太多东西，等我反应过来已经过气了——干脆让 Agent 帮我每天扫一遍。"

让支持 SKILL.md 的 Agent 用最自然的中文一句话拿到 AI 行业每日资讯。无需 API Key、无需配 MCP server。

## 它能做什么

| 能力 | 说明 |
| --- | --- |
| **拉今日/指定日期的日报** | 当天新收录的全部资讯，按模型/产品/行业/论文/技巧分类汇编 |
| **拉 AI 每日必读** | AI 从当天内容中精选的 3-5 条 + 推荐理由 |
| **按分类拉条目** | 只看模型发布、只看论文、只看行业动态 |
| **关键词/公司搜索** | "OpenAI 最近发的"、"Qwen 相关"、"RAG 论文" |
| **查看数据源状态** | 哪些来源今天更新了、哪些没有 |

## 怎么触发

直接用自然语言问，Agent 会自动匹配：

```
今天 AI 圈有什么新东西
看一下最新的 AI 日报
5 月 30 号的 AI 日报
最近的 AI 论文有哪些
看下模型发布动态
最近 OpenAI 有什么发布
Qwen 相关的资讯
AI 每日必读
有哪些新的开源模型
数据来源有哪些
```

## API 端点

基础 URL：`https://aisearches.cc/api/v1`

所有端点返回 JSON，直接 `curl` 或 `fetch` 即可，无需鉴权。

### 资讯

| 端点 | 说明 | 示例 |
|------|------|------|
| `/items.json` | 全量条目（最新 500 条） | `curl $BASE/items.json \| jq length` |
| `/category/ai-models.json` | 模型发布/更新 | 只看大模型相关 |
| `/category/ai-products.json` | 产品发布/更新 | 只看产品发布 |
| `/category/industry.json` | 行业动态 | 融资、政策、市场 |
| `/category/paper.json` | 论文研究 | arXiv、博客深度文章 |
| `/category/tip.json` | 技巧与观点 | 教程、评测、观点 |

### 日报

| 端点 | 说明 |
|------|------|
| `/daily/latest.json` | 最新一天的日报（含当天全部条目） |
| `/daily/2026-06-01.json` | 指定日期日报 |
| `/daily/index.json` | 所有可用日期列表（用于遍历） |

### 其他

| 端点 | 说明 |
|------|------|
| `/digest.json` | AI 每日必读（3-5 条精选 + 推荐理由） |
| `/stories.json` | 事件脉络：同一事件跨源聚合，含进展时间轴、信源印证数、状态（new/developing/settled），适合回答“XX 事件有什么进展” |
| `/sources.json` | 数据来源列表（名称 + 条目数） |
| `/meta.json` | 抓取元数据（时间、各源条目数、失败源） |

## 数据结构

每条资讯的字段：

```json
{
  "id": "rss:openai-abc123",
  "title": "OpenAI 发布 GPT-5",
  "summary": "OpenAI 今日宣布推出 GPT-5，在推理能力上较前代提升显著...",
  "source": "OpenAI",
  "sourceUrl": "https://openai.com/blog/gpt-5",
  "category": "ai-models",
  "publishedAt": "2026-06-01T12:00:00Z",
  "firstSeen": "2026-06-01T22:17:00Z",
  "aiNote": "GPT-5 在推理和多模态能力上大幅提升，定价策略引发行业关注",
  "heat": 1500,
  "origin": "rss:openai",
  "image": "https://..."
}
```

| 字段 | 说明 |
|------|------|
| `title` | 标题 |
| `summary` | 摘要（可能为 null） |
| `source` | 来源名称（如 OpenAI、Hacker News、量子位） |
| `sourceUrl` | 原文链接 |
| `category` | 分类：`ai-models` / `ai-products` / `industry` / `paper` / `tip` |
| `publishedAt` | 原文发布时间 |
| `firstSeen` | 本站首次收录时间 |
| `aiNote` | AI 一句话点评（可能为 null，需配置 DEEPSEEK_API_KEY） |
| `heat` | 热度值（GitHub Star 数 / HN 点赞数，无则为 0） |

## 使用示例

```bash
# 拉最新日报，看今天有多少条
curl -s $BASE/daily/latest.json | jq '.count'

# 拉最新 3 条 AI 模型资讯
curl -s $BASE/category/ai-models.json | jq '.[:3] | .[].title'

# 搜索 OpenAI 相关（客户端过滤）
curl -s $BASE/items.json | jq '[.[] | select(.title | test("OpenAI";"i"))] | .[].title'

# 拉 AI 每日必读
curl -s $BASE/digest.json | jq '.picks[] | "\(.title) — \(.reason)"'

# 查看所有数据来源
curl -s $BASE/sources.json | jq '.[] | "\(.name): \(.count)条"'
```

## 安装

```bash
curl -fsSL https://aisearches.cc/install.sh | bash
```

或手动下载 [SKILL.md](https://aisearches.cc/SKILL.md) 到你的项目根目录。

## 跨平台支持

Claude Code · Codex CLI · Cursor · Gemini CLI · OpenCode · Cline · Windsurf

## 自定义数据源

AI Search 是通用资讯聚合模板。Fork 后修改 `scripts/sources/rss.ts` 的 FEEDS 数组，即可变成任意领域的资讯站（金融、医疗、Web3...），API 端点结构不变，SKILL.md 无需修改。

详见 [README](https://github.com/Jackychen-12/AI-Search#- 换源--变成任何领域的资讯站)。

## 链接

- 在线站点：https://aisearches.cc/
- GitHub：https://github.com/Jackychen-12/AI-Search
- API 基础 URL：https://aisearches.cc/api/v1/
