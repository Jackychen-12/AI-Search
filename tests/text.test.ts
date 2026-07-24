import { describe, expect, it } from "vitest";
import { jsonLdScript } from "../lib/seo";
import { cleanText, decodeEntities } from "../lib/text";

describe("jsonLdScript", () => {
  it("escapes < so crawled content cannot close the script tag", () => {
    const out = jsonLdScript({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script>");
  });

  it("stays valid JSON after escaping", () => {
    const payload = { name: "a </script> b", n: 1 };
    expect(JSON.parse(jsonLdScript(payload))).toEqual(payload);
  });

  it("leaves plain content untouched", () => {
    expect(JSON.parse(jsonLdScript({ t: "GPT-5 发布" }))).toEqual({ t: "GPT-5 发布" });
  });
});

describe("cleanText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(cleanText("<p>hello   <b>world</b></p>")).toBe("hello world");
  });

  it("removes script/style blocks entirely", () => {
    expect(cleanText("a<script>alert(1)</script>b<style>.x{}</style>c")).toBe("abc");
  });

  it("decodes entities; markup revived this way must be handled by consumers", () => {
    // Entities decode AFTER tag stripping, so "&lt;/script&gt;" survives as
    // literal text — safe in React text nodes, and jsonLdScript covers JSON-LD.
    expect(cleanText("x &lt;/script&gt; y")).toBe("x </script> y");
  });

  it("handles null/undefined", () => {
    expect(cleanText(null)).toBe("");
    expect(cleanText(undefined)).toBe("");
  });
});

describe("decodeEntities", () => {
  it("decodes named, decimal and hex entities", () => {
    expect(decodeEntities("a&amp;b &#65; &#x42;")).toBe("a&b A B");
  });

  it("keeps unknown entities as-is", () => {
    expect(decodeEntities("&unknown;")).toBe("&unknown;");
  });
});
