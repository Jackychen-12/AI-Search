/**
 * Build-time share images — two kinds per subject:
 *
 *   og card  (1200x630)  — link-preview image for social embeds (og:image)
 *   share    (1080 x N)  — vertical long-form image with real information
 *                          density, used by the "复制分享图" button
 *
 * Pure SVG -> sharp, zero runtime cost, fits the static export.
 *
 * Outputs (public/posters/):
 *   story-{id}.png / story-{id}-share.png — top stories
 *   stories-latest.png                    — og:image for /stories
 *   daily-latest.png / daily-share.png    — /daily og card + long share image
 *
 * CI note: the runner needs a CJK font (deploy.yml installs fonts-noto-cjk).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { readArchive } from "../lib/archive";
import { readDigest, readLocalItems, readStoreMeta } from "../lib/localStore";
import { buildStories, storyPosterName, storyShareName, type Story } from "../lib/stories";
import { cleanText } from "../lib/text";
import { CATEGORIES } from "../lib/categories";
import type { AIItem } from "../lib/types";

const OUT_DIR = path.resolve("public/posters");
const FONTS = `'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
const STORY_POSTERS = 12;

// ---------- text helpers -----------------------------------------------------

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Approximate text width: CJK ≈ fontSize, ASCII ≈ 0.56 × fontSize. */
function textWidth(s: string, fontSize: number): number {
  let w = 0;
  for (const ch of s) w += /[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? fontSize : fontSize * 0.56;
  return w;
}

/** Greedy wrap into at most maxLines lines; overflow gets an ellipsis. */
function wrap(s: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of s) {
    if (textWidth(cur + ch, fontSize) > maxWidth) {
      lines.push(cur);
      cur = ch;
      if (lines.length === maxLines) break;
    } else {
      cur += ch;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && (cur || textWidth(s, fontSize) > maxWidth * maxLines)) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, "") + "…";
  }
  return lines.slice(0, maxLines);
}

function truncate(s: string, fontSize: number, maxWidth: number): string {
  if (textWidth(s, fontSize) <= maxWidth) return s;
  let cur = "";
  for (const ch of s) {
    if (textWidth(cur + ch + "…", fontSize) > maxWidth) break;
    cur += ch;
  }
  return cur + "…";
}

// ---------- og cards (1200x630) ----------------------------------------------

const OG_W = 1200;
const OG_H = 630;

const OG_FRAME = (body: string) => `
<svg width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eef2fb"/>
    </linearGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${OG_W}" height="6" fill="#2453ee"/>
  ${body}
  <text x="64" y="${OG_H - 46}" font-family="${FONTS}" font-size="22" fill="#9ca3af">aisearches.cc · AI Search</text>
</svg>`;

function storyOgSvg(story: Story, generatedAt: string): string {
  const title = cleanText(story.title);
  const titleLines = wrap(title, 46, OG_W - 128, 2);
  const statusLabel = story.status === "developing" ? "🔥 发酵中" : story.status === "new" ? "新事件" : "已平息";
  const statusColor = story.status === "developing" ? "#ef4444" : story.status === "new" ? "#2453ee" : "#4b5563";
  const badge = `${story.sourceCount} 源印证${story.firstPartyCount > 0 ? ` · 含 ${story.firstPartyCount} 个一手源` : ""}${story.spanDays > 1 ? ` · 追踪 ${story.spanDays} 天` : ""}`;

  const timeline = story.items.slice(-3);
  const badgeY = 188 + titleLines.length * 62;
  const rowY0 = badgeY + 64;
  const rows = timeline
    .map((it, i) => {
      const y = rowY0 + i * 62;
      const line = truncate(cleanText(it.title), 26, OG_W - 128 - 130 - 40);
      return `
  <circle cx="76" cy="${y - 8}" r="5" fill="#2453ee"/>
  ${i < timeline.length - 1 ? `<line x1="76" y1="${y + 2}" x2="76" y2="${y + 44}" stroke="#dbe4f5" stroke-width="2"/>` : ""}
  <text x="100" y="${y}" font-family="${FONTS}" font-size="24" fill="#6b7280">${esc(it.time.slice(5, 10))}</text>
  <text x="186" y="${y}" font-family="${FONTS}" font-size="26" fill="#374151">${esc(line)}</text>
  <text x="${OG_W - 64}" y="${y}" font-family="${FONTS}" font-size="22" fill="#9ca3af" text-anchor="end">${esc(it.source)}</text>`;
    })
    .join("");

  const titleText = titleLines
    .map((l, i) => `<text x="64" y="${188 + i * 62}" font-family="${FONTS}" font-size="46" font-weight="700" fill="#1c2434">${esc(l)}</text>`)
    .join("");

  return OG_FRAME(`
  <text x="64" y="88" font-family="${FONTS}" font-size="26" fill="#6b7280">事件脉络 · ${esc(generatedAt.slice(0, 10))}</text>
  <rect x="64" y="112" rx="6" width="${textWidth(statusLabel, 24) + 28}" height="40" fill="${statusColor}"/>
  <text x="${64 + 14}" y="140" font-family="${FONTS}" font-size="24" fill="#ffffff">${esc(statusLabel)}</text>
  ${titleText}
  <text x="64" y="${badgeY}" font-family="${FONTS}" font-size="28" fill="#2453ee" font-weight="600">${esc(badge)}</text>
  ${rows}
  <text x="64" y="${OG_H - 90}" font-family="${FONTS}" font-size="22" fill="#9ca3af">${esc(truncate(story.sources.join(" · "), 22, OG_W - 128))}</text>`);
}

/** Daily og card — headline picks (never raw GitHub repo slugs). */
function dailyOgSvg(date: string, count: number, picks: { title: string }[]): string {
  const rows = picks
    .slice(0, 4)
    .map((p, i) => {
      const y = 300 + i * 70;
      const line = truncate(cleanText(p.title), 28, OG_W - 128 - 80);
      return `
  <rect x="64" y="${y - 30}" rx="8" width="44" height="44" fill="#2453ee"/>
  <text x="${64 + 22}" y="${y + 2}" font-family="${FONTS}" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${i + 1}</text>
  <text x="128" y="${y}" font-family="${FONTS}" font-size="28" fill="#374151">${esc(line)}</text>`;
    })
    .join("");

  return OG_FRAME(`
  <text x="64" y="96" font-family="${FONTS}" font-size="28" fill="#6b7280">AI 资讯日报</text>
  <text x="64" y="184" font-family="${FONTS}" font-size="64" font-weight="700" fill="#1c2434">${esc(date)}</text>
  <text x="64" y="238" font-family="${FONTS}" font-size="30" fill="#2453ee" font-weight="600">今日新收录 ${count} 条 · AI 精选必读</text>
  ${rows}`);
}

// ---------- long-form share images (1080 x dynamic) ---------------------------

const SH_W = 1080;
const SH_PAD = 72;
const SH_TEXT_W = SH_W - SH_PAD * 2;

interface Block {
  height: number;
  svg: (y: number) => string;
}

function renderLong(blocks: Block[], footerNote: string): string {
  const top = 96;
  let y = top;
  const parts: string[] = [];
  for (const b of blocks) {
    parts.push(b.svg(y));
    y += b.height;
  }
  const h = y + 110;
  return `
<svg width="${SH_W}" height="${h}" viewBox="0 0 ${SH_W} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eef2fb"/>
    </linearGradient>
  </defs>
  <rect width="${SH_W}" height="${h}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${SH_W}" height="8" fill="#2453ee"/>
  ${parts.join("\n")}
  <line x1="${SH_PAD}" y1="${h - 84}" x2="${SH_W - SH_PAD}" y2="${h - 84}" stroke="#dbe4f5" stroke-width="2"/>
  <text x="${SH_PAD}" y="${h - 40}" font-family="${FONTS}" font-size="24" fill="#9ca3af">aisearches.cc · AI Search</text>
  <text x="${SH_W - SH_PAD}" y="${h - 40}" font-family="${FONTS}" font-size="24" fill="#9ca3af" text-anchor="end">${esc(footerNote)}</text>
</svg>`;
}

function textBlock(lines: string[], size: number, color: string, weight = 400, lineH = 0): Block {
  const lh = lineH || Math.round(size * 1.5);
  return {
    height: lines.length * lh + 8,
    svg: (y) =>
      lines
        .map(
          (l, i) =>
            `<text x="${SH_PAD}" y="${y + i * lh}" font-family="${FONTS}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(l)}</text>`,
        )
        .join("\n"),
  };
}

function gap(h: number): Block {
  return { height: h, svg: () => "" };
}

function sectionHeader(label: string, color = "#2453ee"): Block {
  return {
    height: 64,
    svg: (y) => `
  <rect x="${SH_PAD}" y="${y - 26}" width="8" height="34" rx="3" fill="${color}"/>
  <text x="${SH_PAD + 24}" y="${y}" font-family="${FONTS}" font-size="34" font-weight="700" fill="#1c2434">${esc(label)}</text>`,
  };
}

/** Story share image: full timeline + AI note + corroboration. */
function storyShareSvg(story: Story, generatedAt: string): string {
  const blocks: Block[] = [];
  const statusLabel = story.status === "developing" ? "🔥 发酵中" : story.status === "new" ? "新事件" : "已平息";
  const statusColor = story.status === "developing" ? "#ef4444" : story.status === "new" ? "#2453ee" : "#4b5563";

  blocks.push(textBlock([`事件脉络 · ${generatedAt.slice(0, 10)}`], 26, "#6b7280"));
  blocks.push({
    height: 66,
    svg: (y) => `
  <rect x="${SH_PAD}" y="${y - 30}" rx="8" width="${textWidth(statusLabel, 26) + 32}" height="46" fill="${statusColor}"/>
  <text x="${SH_PAD + 16}" y="${y + 2}" font-family="${FONTS}" font-size="26" fill="#ffffff">${esc(statusLabel)}</text>`,
  });
  blocks.push(gap(14));
  blocks.push(textBlock(wrap(cleanText(story.title), 44, SH_TEXT_W, 3), 44, "#1c2434", 700, 62));
  blocks.push(
    textBlock(
      [`${story.sourceCount} 源印证${story.firstPartyCount > 0 ? ` · 含 ${story.firstPartyCount} 个一手源` : ""}${story.spanDays > 1 ? ` · 追踪 ${story.spanDays} 天` : ""}`],
      28,
      "#2453ee",
      600,
    ),
  );

  if (story.aiNote) {
    const noteLines = wrap(`AI · ${story.aiNote}`, 26, SH_TEXT_W - 48, 3);
    const boxH = noteLines.length * 40 + 36;
    blocks.push(gap(10));
    blocks.push({
      height: boxH + 16,
      svg: (y) => `
  <rect x="${SH_PAD}" y="${y - 26}" rx="12" width="${SH_TEXT_W}" height="${boxH}" fill="#2453ee" opacity="0.08"/>
  ${noteLines.map((l, i) => `<text x="${SH_PAD + 24}" y="${y + 12 + i * 40}" font-family="${FONTS}" font-size="26" fill="#1e4fd6">${esc(l)}</text>`).join("\n")}`,
    });
  }

  blocks.push(gap(28));
  blocks.push(sectionHeader("进展时间轴"));
  blocks.push(gap(6));

  const items = story.items.slice(-10);
  items.forEach((it, idx) => {
    const titleLines = wrap(cleanText(it.title), 28, SH_TEXT_W - 150, 2);
    const rowH = titleLines.length * 40 + 46;
    blocks.push({
      height: rowH,
      svg: (y) => `
  <circle cx="${SH_PAD + 10}" cy="${y - 8}" r="6" fill="#2453ee"/>
  ${idx < items.length - 1 ? `<line x1="${SH_PAD + 10}" y1="${y + 4}" x2="${SH_PAD + 10}" y2="${y + rowH - 6}" stroke="#dbe4f5" stroke-width="2"/>` : ""}
  <text x="${SH_PAD + 36}" y="${y}" font-family="${FONTS}" font-size="24" fill="#6b7280">${esc(it.time.slice(5, 10))}</text>
  ${titleLines.map((l, i) => `<text x="${SH_PAD + 130}" y="${y + i * 40}" font-family="${FONTS}" font-size="28" fill="#374151">${esc(l)}</text>`).join("\n")}
  <text x="${SH_PAD + 130}" y="${y + titleLines.length * 40}" font-family="${FONTS}" font-size="22" fill="#9ca3af">${esc(it.source)}${(it.engagement ?? 0) > 0 ? ` · ♨ ${it.engagement!.toLocaleString()}` : ""}</text>`,
    });
    blocks.push(gap(14));
  });

  return renderLong(blocks, `${story.items.length} 条报道 · ${story.sourceCount} 个独立信源`);
}

/** Daily share image: AI picks with reasons + per-category highlights. */
function dailyShareSvg(
  date: string,
  count: number,
  picks: { title: string; source: string; reason?: string }[],
  sections: { label: string; items: AIItem[] }[],
  trendSummary: string | null,
): string {
  const blocks: Block[] = [];
  blocks.push(textBlock(["AI 资讯日报"], 28, "#6b7280"));
  blocks.push(gap(8));
  blocks.push(textBlock([date], 64, "#1c2434", 700, 78));
  blocks.push(textBlock([`今日新收录 ${count} 条公开资讯 · 自动汇编 · 可溯源`], 28, "#2453ee", 600));

  if (trendSummary) {
    const lines = wrap(`趋势 · ${trendSummary}`, 26, SH_TEXT_W - 48, 3);
    const boxH = lines.length * 40 + 36;
    blocks.push(gap(10));
    blocks.push({
      height: boxH + 16,
      svg: (y) => `
  <rect x="${SH_PAD}" y="${y - 26}" rx="12" width="${SH_TEXT_W}" height="${boxH}" fill="#2453ee" opacity="0.08"/>
  ${lines.map((l, i) => `<text x="${SH_PAD + 24}" y="${y + 12 + i * 40}" font-family="${FONTS}" font-size="26" fill="#1e4fd6">${esc(l)}</text>`).join("\n")}`,
    });
  }

  blocks.push(gap(28));
  blocks.push(sectionHeader("AI 每日必读"));
  blocks.push(gap(6));

  picks.slice(0, 5).forEach((p, i) => {
    // Reserve room on the first row for the right-aligned source label.
    const titleLines = wrap(cleanText(p.title), 30, SH_TEXT_W - 76 - 230, 2);
    const reason = p.reason ? wrap(`→ ${p.reason}`, 24, SH_TEXT_W - 76, 2) : [];
    const rowH = titleLines.length * 44 + reason.length * 36 + 40;
    blocks.push({
      height: rowH,
      svg: (y) => `
  <rect x="${SH_PAD}" y="${y - 30}" rx="8" width="44" height="44" fill="#2453ee"/>
  <text x="${SH_PAD + 22}" y="${y + 2}" font-family="${FONTS}" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${i + 1}</text>
  ${titleLines.map((l, li) => `<text x="${SH_PAD + 64}" y="${y + li * 44}" font-family="${FONTS}" font-size="30" font-weight="600" fill="#1c2434">${esc(l)}</text>`).join("\n")}
  <text x="${SH_PAD + 64}" y="${y + titleLines.length * 44 - 8}" font-family="${FONTS}" font-size="0" fill="none"> </text>
  ${reason.map((l, li) => `<text x="${SH_PAD + 64}" y="${y + titleLines.length * 44 + li * 36}" font-family="${FONTS}" font-size="24" fill="#6b7280">${esc(l)}</text>`).join("\n")}
  <text x="${SH_W - SH_PAD}" y="${y}" font-family="${FONTS}" font-size="22" fill="#9ca3af" text-anchor="end">${esc(p.source)}</text>`,
    });
    blocks.push(gap(16));
  });

  // Per-category highlights (top 2 each)
  for (const sec of sections) {
    if (sec.items.length === 0) continue;
    blocks.push(gap(20));
    blocks.push(sectionHeader(sec.label, "#7c3aed"));
    blocks.push(gap(2));
    for (const it of sec.items.slice(0, 2)) {
      const lines = wrap(cleanText(it.title), 27, SH_TEXT_W - 40, 2);
      blocks.push({
        height: lines.length * 40 + 36,
        svg: (y) => `
  <circle cx="${SH_PAD + 8}" cy="${y - 9}" r="5" fill="#7c3aed"/>
  ${lines.map((l, i) => `<text x="${SH_PAD + 30}" y="${y + i * 40}" font-family="${FONTS}" font-size="27" fill="#374151">${esc(l)}</text>`).join("\n")}
  <text x="${SH_PAD + 30}" y="${y + lines.length * 40 - 6}" font-family="${FONTS}" font-size="21" fill="#9ca3af">${esc(it.source)}</text>`,
      });
      blocks.push(gap(10));
    }
  }

  return renderLong(blocks, "每日自动更新 · 零人工干预");
}

// ---------- main ---------------------------------------------------------------

async function render(svg: string, file: string): Promise<void> {
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, file));
}

async function main() {
  const items = readLocalItems();
  if (items.length === 0) {
    console.log("[posters] no snapshot yet — skipping");
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const meta = readStoreMeta();
  const now = meta?.fetchedAt ?? new Date().toISOString();

  // Story posters (og card + long share) — same order as the /stories page.
  const stories = buildStories([...items, ...readArchive()], new Date(now).getTime());
  const top = stories.slice(0, STORY_POSTERS);
  for (const s of top) {
    await render(storyOgSvg(s, now), storyPosterName(s.id));
    await render(storyShareSvg(s, now), storyShareName(s.id));
  }
  if (top.length > 0) {
    await render(storyOgSvg(top[0], now), "stories-latest.png");
  }

  // Daily: picks come from the AI digest (title + reason) — meaningful
  // headlines, never raw GitHub repo slugs. Heat-sorted fallback excludes
  // github items for the same reason.
  const today = now.slice(0, 10);
  const dayItems = items.filter((i) => (i.firstSeen ?? "").slice(0, 10) === today);
  const pool = dayItems.length >= 3 ? dayItems : items;
  const date = dayItems.length >= 3 ? today : (items[0]?.firstSeen ?? now).slice(0, 10);

  const digest = readDigest();
  const picks: { title: string; source: string; reason?: string }[] =
    digest && digest.picks.length > 0
      ? digest.picks.map((p) => ({ title: p.title, source: p.source, reason: p.reason }))
      : [...pool]
          .filter((i) => i.aiSelected !== false && i.origin !== "github")
          .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))
          .slice(0, 5)
          .map((i) => ({ title: i.title, source: i.source, reason: i.aiNote ?? undefined }));

  const sections = CATEGORIES.map((c) => ({
    label: c.label,
    items: pool
      .filter((i) => i.category === c.key)
      .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0)),
  }));

  await render(dailyOgSvg(date, pool.length, picks), "daily-latest.png");
  await render(dailyShareSvg(date, pool.length, picks, sections, digest?.trendSummary ?? null), "daily-share.png");

  console.log(`[posters] ${top.length} story og+share pair(s), stories-latest, daily og+share`);
}

main().catch((e) => {
  console.error("[posters] failed:", e.message);
  process.exit(0); // never block the build on posters
});
