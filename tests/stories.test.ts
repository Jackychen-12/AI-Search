import { describe, expect, it } from "vitest";
import { buildStories, sameEvent, tokensOf } from "../lib/stories";
import type { AIItem } from "../lib/types";

function mk(partial: Partial<AIItem> & { id: string; title: string }): AIItem {
  return {
    summary: null,
    source: "SourceA",
    sourceUrl: "https://example.com/" + partial.id,
    category: null,
    publishedAt: "2026-07-20T10:00:00.000Z",
    ...partial,
  } as AIItem;
}

describe("tokensOf", () => {
  it("extracts ascii words and cjk bigrams, drops stopwords", () => {
    const toks = tokensOf("OpenAI 发布新模型 GPT-6 for the world");
    expect(toks.has("openai")).toBe(true);
    expect(toks.has("gpt-6")).toBe(true);
    expect(toks.has("发布")).toBe(true);
    expect(toks.has("新模")).toBe(true);
    expect(toks.has("the")).toBe(false);
    expect(toks.has("for")).toBe(false);
  });
});

describe("sameEvent", () => {
  const node = (title: string, entities: string[] = []) => ({ tokens: tokensOf(title), entities });

  it("links same-event titles across wording variants", () => {
    expect(
      sameEvent(
        node("Anthropic settles $1.5B copyright lawsuit over pirated books", ["anthropic"]),
        node("Judge approves $1.5B Anthropic settlement for pirated books", ["anthropic"]),
      ),
    ).toBe(true);
  });

  it("does not link different companies doing similar things", () => {
    expect(
      sameEvent(
        node("OpenAI 发布新模型", ["openai"]),
        node("Anthropic 发布新模型", ["anthropic"]),
      ),
    ).toBe(false); // entity-disjoint veto
  });

  it("does not link on a single generic shared token", () => {
    expect(
      sameEvent(
        node("Understanding transformers deeply"),
        node("Transformers are eating the world of software"),
      ),
    ).toBe(false);
  });
});

describe("buildStories", () => {
  const now = new Date("2026-07-21T12:00:00.000Z").getTime();

  it("clusters cross-source coverage into one story with a timeline", () => {
    const items: AIItem[] = [
      mk({ id: "a1", title: "Anthropic settles $1.5B copyright lawsuit over pirated books", source: "TechCrunch", publishedAt: "2026-07-20T08:00:00.000Z", heat: 100 }),
      mk({ id: "a2", title: "Judge approves $1.5B Anthropic settlement for pirated books", source: "Hacker News", publishedAt: "2026-07-21T09:00:00.000Z", heat: 900 }),
      mk({ id: "a3", title: "Anthropic copyright settlement of $1.5B gets court approval for pirated books case", source: "The Verge", publishedAt: "2026-07-21T10:00:00.000Z", heat: 50 }),
      mk({ id: "b1", title: "NVIDIA unveils next-gen Rubin GPU platform", source: "NVIDIA", publishedAt: "2026-07-21T07:00:00.000Z", heat: 300 }),
    ];
    const stories = buildStories(items, now);
    expect(stories).toHaveLength(1);
    const s = stories[0];
    expect(s.items.map((i) => i.id)).toEqual(["a1", "a2", "a3"]); // ascending time
    expect(s.sourceCount).toBe(3);
    expect(s.id).toBe("a1"); // earliest item -> stable id
    expect(s.title).toContain("Judge approves"); // representative = max heat
    expect(s.status).toBe("developing"); // spans 2 days, updated recently
    expect(s.spanDays).toBe(2);
  });

  it("requires at least two distinct sources", () => {
    const items: AIItem[] = [
      mk({ id: "c1", title: "Mistral releases Magistral 2 reasoning model", source: "VentureBeat", publishedAt: "2026-07-21T08:00:00.000Z" }),
      mk({ id: "c2", title: "Mistral's Magistral 2 reasoning model released today", source: "VentureBeat", publishedAt: "2026-07-21T09:00:00.000Z" }),
    ];
    expect(buildStories(items, now)).toHaveLength(0);
  });

  it("marks stale stories as settled", () => {
    const items: AIItem[] = [
      mk({ id: "d1", title: "DeepSeek R2 tops open weights benchmark leaderboard", source: "量子位", publishedAt: "2026-07-15T08:00:00.000Z" }),
      mk({ id: "d2", title: "DeepSeek R2 tops open weights benchmark, community verifies", source: "Hacker News", publishedAt: "2026-07-15T20:00:00.000Z" }),
    ];
    const stories = buildStories(items, now);
    expect(stories).toHaveLength(1);
    expect(stories[0].status).toBe("settled");
  });

  it("does not chain unrelated items beyond the link window", () => {
    const items: AIItem[] = [
      mk({ id: "e1", title: "Google Gemini 3 Pro launches with 2M context window", source: "Google AI", publishedAt: "2026-07-10T08:00:00.000Z" }),
      mk({ id: "e2", title: "Gemini 3 Pro launches: 2M context window explained", source: "The Verge", publishedAt: "2026-07-20T08:00:00.000Z" }),
    ];
    expect(buildStories(items, now)).toHaveLength(0); // 10 days apart -> no link
  });
});
