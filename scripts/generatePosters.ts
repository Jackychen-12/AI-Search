/**
 * Build-time share posters (1200x630 PNG) for the top storylines and the
 * latest daily digest — turning high-value editorial output into shareable
 * content slices. Pure SVG -> sharp, no runtime cost, fits the static export.
 *
 * Outputs (public/posters/):
 *   story-{safeId}.png   — top stories (page order), used by the share button
 *   stories-latest.png   — copy of the #1 story poster (og:image for /stories)
 *   daily-latest.png     — latest daily digest poster (og:image for /daily)
 *
 * CI note: the runner needs a CJK font (deploy.yml installs fonts-noto-cjk).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { readArchive } from "../lib/archive";
import { readLocalItems, readStoreMeta } from "../lib/localStore";
import { buildStories, storyPosterName, type Story } from "../lib/stories";
import { cleanText } from "../lib/text";

const OUT_DIR = path.resolve("public/posters");
const W = 1200;
const H = 630;
const FONTS = `'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
const STORY_POSTERS = 12;

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

/** Greedy wrap into at most maxLines lines; last line gets an ellipsis. */
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

const FRAME = (body: string) => `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f1219"/>
      <stop offset="1" stop-color="#1b2340"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="#2453ee"/>
  ${body}
  <text x="64" y="${H - 46}" font-family="${FONTS}" font-size="22" fill="#5b6478">aisearches.cc · AI Search</text>
</svg>`;

function storySvg(story: Story, generatedAt: string): string {
  const title = cleanText(story.title);
  const titleLines = wrap(title, 46, W - 128, 2);
  const statusLabel = story.status === "developing" ? "🔥 发酵中" : story.status === "new" ? "新事件" : "已平息";
  const statusColor = story.status === "developing" ? "#ef4444" : story.status === "new" ? "#2453ee" : "#4b5563";
  const badge = `${story.sourceCount} 源印证${story.firstPartyCount > 0 ? ` · 含 ${story.firstPartyCount} 个一手源` : ""}${story.spanDays > 1 ? ` · 追踪 ${story.spanDays} 天` : ""}`;

  const timeline = story.items.slice(-3);
  const badgeY = 188 + titleLines.length * 62;
  const rowY0 = badgeY + 64; // keep clear air between the badge line and the timeline
  const rows = timeline
    .map((it, i) => {
      const y = rowY0 + i * 62;
      const line = truncate(cleanText(it.title), 26, W - 128 - 130 - 40);
      return `
  <circle cx="76" cy="${y - 8}" r="5" fill="#2453ee"/>
  ${i < timeline.length - 1 ? `<line x1="76" y1="${y + 2}" x2="76" y2="${y + 44}" stroke="#2a3350" stroke-width="2"/>` : ""}
  <text x="100" y="${y}" font-family="${FONTS}" font-size="24" fill="#8b93a7">${esc(it.time.slice(5, 10))}</text>
  <text x="186" y="${y}" font-family="${FONTS}" font-size="26" fill="#dbe1ee">${esc(line)}</text>
  <text x="${W - 64}" y="${y}" font-family="${FONTS}" font-size="22" fill="#5b6478" text-anchor="end">${esc(it.source)}</text>`;
    })
    .join("");

  const titleText = titleLines
    .map((l, i) => `<text x="64" y="${188 + i * 62}" font-family="${FONTS}" font-size="46" font-weight="700" fill="#f3f4f6">${esc(l)}</text>`)
    .join("");

  return FRAME(`
  <text x="64" y="88" font-family="${FONTS}" font-size="26" fill="#8b93a7">事件脉络 · ${esc(generatedAt.slice(0, 10))}</text>
  <rect x="64" y="112" rx="6" width="${textWidth(statusLabel, 24) + 28}" height="40" fill="${statusColor}"/>
  <text x="${64 + 14}" y="140" font-family="${FONTS}" font-size="24" fill="#ffffff">${esc(statusLabel)}</text>
  ${titleText}
  <text x="64" y="${badgeY}" font-family="${FONTS}" font-size="28" fill="#5ba2ff" font-weight="600">${esc(badge)}</text>
  ${rows}
  <text x="64" y="${H - 90}" font-family="${FONTS}" font-size="22" fill="#5b6478">${esc(truncate(story.sources.join(" · "), 22, W - 128))}</text>`);
}

function dailySvg(date: string, count: number, picks: { title: string; source: string }[]): string {
  const rows = picks
    .slice(0, 4)
    .map((p, i) => {
      const y = 300 + i * 70;
      const line = truncate(cleanText(p.title), 28, W - 128 - 80);
      return `
  <rect x="64" y="${y - 30}" rx="8" width="44" height="44" fill="#2453ee"/>
  <text x="${64 + 22}" y="${y + 2}" font-family="${FONTS}" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${i + 1}</text>
  <text x="128" y="${y}" font-family="${FONTS}" font-size="28" fill="#dbe1ee">${esc(line)}</text>`;
    })
    .join("");

  return FRAME(`
  <text x="64" y="96" font-family="${FONTS}" font-size="28" fill="#8b93a7">AI 资讯日报</text>
  <text x="64" y="184" font-family="${FONTS}" font-size="64" font-weight="700" fill="#f3f4f6">${esc(date)}</text>
  <text x="64" y="238" font-family="${FONTS}" font-size="30" fill="#5ba2ff" font-weight="600">今日新收录 ${count} 条 · AI 精选必读</text>
  ${rows}`);
}

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

  // Story posters — same order as the /stories page.
  const stories = buildStories([...items, ...readArchive()], new Date(now).getTime());
  const top = stories.slice(0, STORY_POSTERS);
  for (const s of top) {
    await render(storySvg(s, now), storyPosterName(s.id));
  }
  if (top.length > 0) {
    await render(storySvg(top[0], now), "stories-latest.png");
  }

  // Latest daily poster — top featured picks from today's collected items.
  const today = now.slice(0, 10);
  const dayItems = items.filter((i) => (i.firstSeen ?? "").slice(0, 10) === today);
  const pool = dayItems.length >= 3 ? dayItems : items;
  const date = dayItems.length >= 3 ? today : (items[0]?.firstSeen ?? now).slice(0, 10);
  const picks = [...pool]
    .filter((i) => i.aiSelected !== false)
    .sort((a, b) => (b.heat ?? 0) - (a.heat ?? 0))
    .slice(0, 4)
    .map((i) => ({ title: i.title, source: i.source }));
  await render(dailySvg(date, pool.length, picks), "daily-latest.png");

  console.log(`[posters] ${top.length} story poster(s) + stories-latest + daily-latest`);
}

main().catch((e) => {
  console.error("[posters] failed:", e.message);
  process.exit(0); // never block the build on posters
});
