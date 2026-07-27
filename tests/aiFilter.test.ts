import { describe, expect, it } from "vitest";
import { isAiRelated } from "../scripts/lib/aiFilter";
import { collapseNearDuplicates } from "../scripts/lib/persist";
import type { AIItem } from "../lib/types";

describe("isAiRelated", () => {
  it("accepts strong-signal titles on their own", () => {
    expect(isAiRelated("OpenAI 发布新一代模型", "")).toBe(true);
    expect(isAiRelated("Anthropic ships Claude Opus 5", "")).toBe(true);
    expect(isAiRelated("多模态理解新突破", "")).toBe(true);
    expect(isAiRelated("Meta unveils new world model for robotics", "")).toBe(true);
  });

  it("rejects single weak-word hits (phone chips, fitness, biz models)", () => {
    expect(isAiRelated("iPhone 18 芯片性能曝光", "苹果自研基带")).toBe(false);
    expect(isAiRelated("如何科学安排力量训练", "健身指南")).toBe(false);
    expect(isAiRelated("拆解瑞幸的商业模式", "咖啡市场分析")).toBe(false);
  });

  it("accepts two weak words together", () => {
    expect(isAiRelated("国产 GPU 算力集群落地", "")).toBe(true);
  });

  it("respects word boundaries for short latin terms", () => {
    expect(isAiRelated("First aid tips for hikers", "")).toBe(false);
    expect(isAiRelated("He said the paint dried", "")).toBe(false);
    expect(isAiRelated("AI adoption is growing", "")).toBe(true);
  });
});

function it2(id: string, title: string, over: Partial<AIItem> = {}): AIItem {
  return {
    id,
    title,
    summary: null,
    source: "s",
    sourceUrl: `https://example.com/${id}`,
    category: null,
    publishedAt: "2026-07-26T12:00:00Z",
    ...over,
  };
}

describe("collapseNearDuplicates", () => {
  it("merges same-story rewrites, keeping the richer entry", () => {
    const a = it2("a", "OpenAI 正式发布 GPT-5 大模型");
    const b = it2("b", "OpenAI 发布 GPT-5 大模型，正式上线", { summary: "详细摘要……" });
    const out = collapseNearDuplicates([a, b]);
    expect(out.map((i) => i.id)).toEqual(["b"]);
  });

  it("keeps distinct stories apart", () => {
    const a = it2("a", "OpenAI 发布 GPT-5 大模型");
    const b = it2("b", "Anthropic 发布 Claude Opus 5 模型");
    expect(collapseNearDuplicates([a, b])).toHaveLength(2);
  });

  it("does not merge across a 72h+ publish gap", () => {
    const a = it2("a", "OpenAI 正式发布 GPT-5 大模型");
    const b = it2("b", "OpenAI 发布 GPT-5 大模型，正式上线", { publishedAt: "2026-07-20T12:00:00Z" });
    expect(collapseNearDuplicates([a, b])).toHaveLength(2);
  });

  it("leaves short titles alone", () => {
    const a = it2("a", "GPT-5");
    const b = it2("b", "GPT-5 上线");
    expect(collapseNearDuplicates([a, b])).toHaveLength(2);
  });
});
