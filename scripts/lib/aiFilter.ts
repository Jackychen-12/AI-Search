/**
 * "Is this AI-related?" gate for general-purpose feeds (aiOnly sources).
 *
 * Two keyword classes:
 *   STRONG — unambiguous on their own (product/company/model names, AI terms).
 *   WEAK   — common tech words ("模型", "训练", "芯片", "gpu") that appear in
 *            plenty of non-AI coverage (phone chips, fitness training, business
 *            models). One weak hit is NOT enough; two are.
 */

const STRONG_KEYWORDS = [
  // generic AI terms ("ai" is boundary-matched — whole word only)
  "ai", "人工智能", "大模型", "大语言模型", "生成式", "多模态", "神经网络", "机器学习", "深度学习",
  "智能体", "具身智能", "文生图", "文生视频", "视频生成", "图像生成", "语音识别",
  "llm", "agi", "chatbot", "copilot", "transformer", "diffusion", "embedding", "rag",
  "machine learning", "deep learning", "neural network", "generative", "multimodal",
  "world model", "vision language", "text-to-image", "text-to-video", "open-weight",
  "reasoning model", "frontier model", "foundation model", "robotics", "机器人",
  // labs / companies (AI-only brands)
  "openai", "anthropic", "deepseek", "mistral", "midjourney", "hugging face", "huggingface",
  "stability ai", "perplexity", "智谱", "moonshot", "月之暗面", "百川", "baichuan", "minimax",
  "阶跃星辰", "零一万物", "面壁", "xai", "ssi", "safe superintelligence",
  // models / products
  "gpt", "chatgpt", "claude", "gemini", "llama", "qwen", "通义", "千问", "文心", "豆包",
  "doubao", "kimi", "glm", "grok", "sora", "stable diffusion", "dall-e", "dall·e",
  "o1", "o3", "veo", "imagen", "flux", "hunyuan", "混元", "cursor", "devin", "manus",
  "notebooklm", "nano banana", "yi-",
  // techniques
  "微调", "fine-tun", "蒸馏", "distillation", "强化学习", "rlhf", "prompt", "提示词",
  "预训练", "pretrain", "post-train", "开源模型", "moe", "mixture of experts",
  "扩散模型", "端侧模型", "推理模型", "vibe coding",
];

const WEAK_KEYWORDS = [
  "模型", "训练", "推理", "算力", "gpu", "芯片", "nvidia", "英伟达", "cuda",
  "agent", "智能", "tpu", "inference", "benchmark", "开源", "token", "算法",
];

// Short/generic latin terms need word boundaries ("ai" must not hit "aid",
// "said"; "agent" must not hit "agents of change" is fine but "reagent" not).
const WORD_BOUNDARY_TERMS = new Set(["ai", "agent", "gpt", "llm", "agi", "moe", "o1", "o3", "tpu", "token", "grok", "veo", "flux", "ssi"]);

function hit(hay: string, k: string): boolean {
  if (WORD_BOUNDARY_TERMS.has(k)) return new RegExp(`\\b${k}\\b`, "i").test(hay);
  return hay.includes(k);
}

export function isAiRelated(title: string, summary: string): boolean {
  const hay = `${title} ${summary}`.toLowerCase();
  if (STRONG_KEYWORDS.some((k) => hit(hay, k))) return true;
  let weak = 0;
  for (const k of WEAK_KEYWORDS) {
    if (hit(hay, k)) weak++;
    if (weak >= 2) return true;
  }
  return false;
}
