const AI_KEYWORDS = [
  "ai", "a.i", "人工智能", "大模型", "模型", "llm", "gpt", "claude", "gemini", "llama",
  "智能体", "agent", "生成式", "多模态", "神经网络", "机器学习", "深度学习", "openai",
  "anthropic", "deepseek", "通义", "千问", "qwen", "文心", "豆包", "kimi", "moonshot",
  "训练", "推理", "算力", "gpu", "芯片", "nvidia", "cuda",
  "开源模型", "diffusion", "扩散", "rag", "微调", "embedding", "transformer", "agi",
  "neural", "machine learning", "deep learning", "chatbot", "copilot", "stable diffusion",
  "sora", "midjourney", "cursor", "devin", "manus", "智谱", "glm", "baichuan", "yi-",
];

const WORD_BOUNDARY_TERMS = new Set(["ai", "agent"]);

export function isAiRelated(title: string, summary: string): boolean {
  const hay = `${title} ${summary}`.toLowerCase();
  return AI_KEYWORDS.some((k) => {
    if (WORD_BOUNDARY_TERMS.has(k)) {
      return new RegExp(`\\b${k}\\b`, "i").test(hay);
    }
    return hay.includes(k);
  });
}
