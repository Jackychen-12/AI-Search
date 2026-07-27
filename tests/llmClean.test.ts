import { describe, expect, it } from "vitest";
import { extractJsonArray, stripRefMarks } from "../scripts/lib/llmClean";

describe("stripRefMarks", () => {
  it("removes full-width bracket #refs", () => {
    expect(stripRefMarks("Agent 方向升温（#3、#7、#12），值得关注。")).toBe(
      "Agent 方向升温，值得关注。",
    );
  });

  it("removes half-width bracket #refs", () => {
    expect(stripRefMarks("OpenAI released GPT-5 (#2) this week (#4, #6).")).toBe(
      "OpenAI released GPT-5 this week.",
    );
  });

  it("removes bare #N mentions and husk brackets left by partial cleaning", () => {
    expect(stripRefMarks("热度最高的是 #3 的发布，多模态（、、）持续升温")).toBe(
      "热度最高的是 的发布，多模态持续升温",
    );
  });

  it("leaves normal brackets and text alone", () => {
    const s = "Meta（原 Facebook）发布 Llama 5，参数量 400B。";
    expect(stripRefMarks(s)).toBe(s);
  });
});

describe("extractJsonArray", () => {
  it("parses a plain JSON array", () => {
    expect(extractJsonArray('[{"n":1,"reason":"重磅"}]')).toEqual([{ n: 1, reason: "重磅" }]);
  });

  it("parses fenced output", () => {
    expect(extractJsonArray('```json\n[{"n":2,"reason":"x"}]\n```')).toEqual([
      { n: 2, reason: "x" },
    ]);
  });

  it("parses arrays wrapped in prose", () => {
    const raw = '好的，以下是我的挑选：\n[{"n":3,"reason":"开源"}]\n希望对你有帮助！';
    expect(extractJsonArray(raw)).toEqual([{ n: 3, reason: "开源" }]);
  });

  it("returns null on garbage instead of throwing", () => {
    expect(extractJsonArray("抱歉，我无法完成这个任务。")).toBeNull();
    expect(extractJsonArray('{"n":1}')).toBeNull();
  });
});
