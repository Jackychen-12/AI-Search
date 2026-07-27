import { describe, expect, it } from "vitest";
import { computeHeat } from "../scripts/lib/heat";
import type { AIItem } from "../lib/types";

const NOW = Date.parse("2026-07-27T00:00:00Z");

function item(over: Partial<AIItem>): AIItem {
  return {
    id: Math.random().toString(36).slice(2),
    title: "t",
    summary: null,
    source: "s",
    sourceUrl: "https://example.com/x",
    category: null,
    publishedAt: "2026-07-26T12:00:00Z",
    ...over,
  };
}

const TIERS = { "rss:openai": 1, "rss:36kr": 3, github: 1, hackernews: 2 };

describe("computeHeat", () => {
  it("scores everything in 0-100 and never zero for fresh items", () => {
    const out = computeHeat(
      [item({ origin: "rss:openai" }), item({ origin: "github", engagement: 5000 })],
      TIERS,
      NOW,
    );
    for (const it of out) {
      expect(it.heat).toBeGreaterThan(0);
      expect(it.heat).toBeLessThanOrEqual(100);
    }
  });

  it("fresh tier-1 RSS (no engagement) outranks a mid-pack aggregator item", () => {
    const [openai, kr36] = computeHeat(
      [item({ id: "a", origin: "rss:openai" }), item({ id: "b", origin: "rss:36kr" })],
      TIERS,
      NOW,
    );
    expect(openai.heat!).toBeGreaterThan(kr36.heat!);
  });

  it("normalizes engagement within origin: top GH repo ≈ top HN story", () => {
    const out = computeHeat(
      [
        item({ id: "gh-top", origin: "github", engagement: 9000 }),
        item({ id: "gh-low", origin: "github", engagement: 30 }),
        item({ id: "hn-top", origin: "hackernews", engagement: 900 }),
        item({ id: "hn-low", origin: "hackernews", engagement: 45 }),
      ],
      TIERS,
      NOW,
    );
    const by = Object.fromEntries(out.map((i) => [i.id, i.heat!]));
    // tops of each origin land close together despite a 10x raw scale gap
    // (github is tier 1 vs hackernews tier 2, hence the base offset of 15)
    expect(Math.abs(by["gh-top"] - 15 - by["hn-top"])).toBeLessThanOrEqual(8);
    expect(by["gh-top"]).toBeGreaterThan(by["gh-low"]);
    expect(by["hn-top"]).toBeGreaterThan(by["hn-low"]);
  });

  it("decays with age but keeps a floor for archives", () => {
    const [fresh, old] = computeHeat(
      [
        item({ id: "f", origin: "rss:openai", publishedAt: "2026-07-26T12:00:00Z" }),
        item({ id: "o", origin: "rss:openai", publishedAt: "2026-05-01T12:00:00Z" }),
      ],
      TIERS,
      NOW,
    );
    expect(fresh.heat!).toBeGreaterThan(old.heat!);
    expect(old.heat!).toBeGreaterThanOrEqual(Math.round(55 * 0.55));
  });

  it("unknown origin falls back to tier 3", () => {
    const [x] = computeHeat([item({ origin: "mystery" })], TIERS, NOW);
    expect(x.heat!).toBeLessThanOrEqual(30);
  });
});
