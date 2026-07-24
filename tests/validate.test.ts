import { describe, expect, it } from "vitest";
import { sanitizeItem, sanitizeItems } from "../lib/validate";
import type { AIItem } from "../lib/types";

function mk(partial: Partial<AIItem>): AIItem {
  return {
    id: "x-1",
    title: "A valid title",
    summary: null,
    source: "TechCrunch",
    sourceUrl: "https://example.com/a",
    category: null,
    publishedAt: "2026-07-20T10:00:00.000Z",
    ...partial,
  } as AIItem;
}

describe("sanitizeItem", () => {
  it("passes a normal item through unchanged", () => {
    const it_ = sanitizeItem(mk({ heat: 42, summary: "ok" }));
    expect(it_).not.toBeNull();
    expect(it_!.heat).toBe(42);
    expect(it_!.summary).toBe("ok");
  });

  it("drops items with dangerous url protocols", () => {
    expect(sanitizeItem(mk({ sourceUrl: "javascript:alert(1)" }))).toBeNull();
    expect(sanitizeItem(mk({ sourceUrl: "data:text/html,x" }))).toBeNull();
    expect(sanitizeItem(mk({ sourceUrl: "//evil.com/x" }))).toBeNull();
  });

  it("drops items missing required fields", () => {
    expect(sanitizeItem(mk({ title: "   " }))).toBeNull();
    expect(sanitizeItem(mk({ id: "" }))).toBeNull();
    expect(sanitizeItem(mk({ source: "" }))).toBeNull();
  });

  it("clamps oversized fields instead of dropping", () => {
    const it_ = sanitizeItem(mk({ title: "t".repeat(9999), summary: "s".repeat(99999) }));
    expect(it_!.title.length).toBe(300);
    expect(it_!.summary!.length).toBe(2000);
  });

  it("forces image to https and rejects http image", () => {
    expect(sanitizeItem(mk({ image: "http://x.com/a.png" }))!.image).toBeNull();
    expect(sanitizeItem(mk({ image: "https://x.com/a.png" }))!.image).toBe("https://x.com/a.png");
  });

  it("normalizes bogus heat and dates", () => {
    const it_ = sanitizeItem(mk({ heat: Number.NaN, publishedAt: "not-a-date" }));
    expect(it_!.heat).toBe(0);
    expect(it_!.publishedAt).toBeNull();
    expect(sanitizeItem(mk({ heat: -5 }))!.heat).toBe(0);
  });
});

describe("sanitizeItems", () => {
  it("drops invalid entries and reports the count", () => {
    const { items, dropped } = sanitizeItems([
      mk({}),
      mk({ id: "x-2", sourceUrl: "javascript:void(0)" }),
      mk({ id: "x-3" }),
    ]);
    expect(items).toHaveLength(2);
    expect(dropped).toBe(1);
  });
});
