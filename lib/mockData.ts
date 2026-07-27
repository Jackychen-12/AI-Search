import type { AIItem, CategoryKey } from "./types";

const SOURCES = [
  { name: "机器之心", url: "https://www.jiqizhixin.com" },
  { name: "量子位", url: "https://www.qbitai.com" },
  { name: "InfoQ", url: "https://www.infoq.cn" },
  { name: "36氪", url: "https://36kr.com" },
  { name: "新智元", url: "https://mp.weixin.qq.com" },
  { name: "Hugging Face", url: "https://huggingface.co/blog" },
  { name: "arXiv", url: "https://arxiv.org" },
  { name: "GitHub Trending", url: "https://github.com/trending" },
];

const TAGS_POOL = [
  "LLM", "多模态", "Agent", "RAG", "开源", "Diffusion",
  "RLHF", "推理", "训练", "微调", "Embedding", "向量检索",
  "国产模型", "GPU", "推理加速", "Chip", "评测", "数据集",
];

function pick<T>(arr: T[], n = 1, seed = 0): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = (seed + i * 7 + 3) % copy.length;
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

function isoTimestampOffset(hoursAgo: number) {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

interface Seed {
  title: string;
  summary: string;
  category: CategoryKey;
}

const SEEDS: Seed[] = [
  { title: "国内厂商发布新一代多模态大模型", summary: "支持图像、音频、视频统一理解，上下文窗口扩展至百万级 token。", category: "ai-models" },
  { title: "开源 Agent 框架月度活跃度榜单", summary: "本月最受关注的 Agent 项目，按 Star 增量与社区讨论量综合排序。", category: "ai-products" },
  { title: "AI 编程助手用户调研报告", summary: "覆盖一万名开发者的使用数据，揭示 IDE 集成型助手的留存表现。", category: "industry" },
  { title: "稳定扩散新版本发布", summary: "在图生图与视频生成场景下显著优化采样速度与一致性。", category: "ai-products" },
  { title: "顶会论文：长上下文检索新方法", summary: "提出基于分层索引的长文档检索方案，召回率提升明显。", category: "paper" },
  { title: "AI 芯片初创公司完成新一轮融资", summary: "围绕推理侧自研架构，融资将用于流片与生态建设。", category: "industry" },
  { title: "新一版生成式 AI 服务管理办法征求意见", summary: "在数据来源、内容标识与备案流程方面提出新的合规要求。", category: "industry" },
  { title: "为什么 Agent 落地比想象中慢", summary: "从工程化、可观测性与成本三个角度，拆解企业 Agent 实施的真实瓶颈。", category: "tip" },
  { title: "RAG 系统中的重排策略对比", summary: "对几类主流 reranker 在企业知识库场景下的端到端效果做系统评测。", category: "paper" },
  { title: "代码生成模型在真实项目上的评测", summary: "在多语言、多仓库规模上，比较主流模型的修复率与回归率。", category: "ai-models" },
  { title: "AI 工作流编排平台横评", summary: "对低代码 AI 工作流平台从能力、价格、生态做横向比较。", category: "ai-products" },
  { title: "国产 GPU 在大模型训练上的实测", summary: "在百亿参数级模型上的训练吞吐、稳定性与生态适配实测。", category: "industry" },
  { title: "AI 视频生成的版权边界", summary: "梳理近期判例与平台规则，讨论生成内容的归属与使用边界。", category: "tip" },
  { title: "面向企业的 Agent 评测基准发布", summary: "覆盖客服、销售、研发助理等真实业务场景的多任务评测套件。", category: "paper" },
  { title: "知识库问答的事实性提升方案", summary: "结合检索增强、引用回写与对抗训练的工程实践与开源代码。", category: "ai-products" },
  { title: "AI 硬件创业公司 Demo Day", summary: "本季 demo day 的入选项目与投资人最关注的三个方向。", category: "industry" },
  { title: "为什么我们暂停了大模型训练投入", summary: "一家中型互联网公司 CTO 的反思与下一阶段的 AI 路线选择。", category: "tip" },
  { title: "推理框架性能基准更新", summary: "在主流硬件与不同 batch 设置下，主要推理框架的吞吐与延迟对比。", category: "ai-products" },
  { title: "通用 Agent 评测中的提示注入风险", summary: "在公开 Agent 测试集上系统度量提示注入成功率与防御方案表现。", category: "paper" },
  { title: "本地小模型 + 云端大模型的协同范式", summary: "在端侧场景下，端云协同的延迟、隐私与成本三方平衡实践。", category: "tip" },
];

function gen(n: number): AIItem[] {
  const items: AIItem[] = [];
  for (let i = 0; i < n; i++) {
    const seed = SEEDS[i % SEEDS.length];
    const src = SOURCES[i % SOURCES.length];
    const tags = pick(TAGS_POOL, 2 + (i % 3), i);
    items.push({
      id: `mock-${pad(i + 1, 4)}`,
      title: `${seed.title}${i >= SEEDS.length ? ` (${Math.floor(i / SEEDS.length) + 1})` : ""}`,
      summary: seed.summary,
      source: src.name,
      sourceUrl: src.url,
      category: seed.category,
      tags,
      publishedAt: isoTimestampOffset(i * 3),
      heat: Math.max(25, 95 - i + ((i * 13 + 7) % 10)), // 0-100 scale, like the crawler
      aiSelected: i % 3 !== 0,
    });
  }
  return items;
}

export const MOCK_ITEMS: AIItem[] = gen(120);
