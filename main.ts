// main.ts — news-image-20261122 v2: FLIGHT RECORDER — ONE DAY, THREE BEATS
// Spec v2 (sol CLI xhigh + metode irvan-motion). Node 22 stdlib only.
// Deterministic: same input -> same bytes. 1024x1024 RGB PNG, vector stroke font.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1024, H = 1024;
// palette (spec v2)
const BG = 0x0b1320, PANEL = 0x142235, INK = 0xf4eedf, MUTED = 0xa9b4c2;
const FACT = 0x35d39a, CLAIM = 0xffb547, DEV = 0xf16667, RAIL = 0x75d5ff;

const buf = Buffer.alloc(W * H * 3);
function px(x: number, y: number, c: number) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = (c >> 16) & 255; buf[i + 1] = (c >> 8) & 255; buf[i + 2] = c & 255;
}
function rect(x: number, y: number, w: number, h: number, c: number) {
  for (let j = Math.max(0, y | 0); j < Math.min(H, (y + h) | 0); j++)
    for (let i = Math.max(0, x | 0); i < Math.min(W, (x + w) | 0); i++) px(i, j, c);
}
function hline(x0: number, x1: number, y: number, c: number) { rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, c); }
function vline(x: number, y0: number, y1: number, c: number) { rect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, c); }
function disc(cx: number, cy: number, r: number, c: number) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) px(x, y, c);
}
function ring(cx: number, cy: number, r: number, w: number, c: number) {
  for (let a = 0; a < 360; a += 1) {
    const t = (a * Math.PI) / 180;
    for (let k = 0; k < w; k++) px(Math.round(cx + (r - k) * Math.cos(t)), Math.round(cy + (r - k) * Math.sin(t)), c);
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: number) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= n; i++) px(Math.round(x0 + (dx * i) / n), Math.round(y0 + (dy * i) / n), c);
}
// thick line: stamp discs along the segment
function tline(x0: number, y0: number, x1: number, y1: number, w: number, c: number) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1) * 2;
  for (let i = 0; i <= n; i++) disc(x0 + (dx * i) / n, y0 + (dy * i) / n, w / 2, c);
}
function poly(pts: number[][], w: number, c: number, close = false) {
  for (let i = 0; i + 1 < pts.length; i++) tline(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, c);
  if (close && pts.length > 2) tline(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], w, c);
}
function fillTri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number) {
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
    }
    if (xs.length >= 2) { const a = Math.min(...xs), b = Math.max(...xs); for (let x = Math.floor(a); x <= Math.ceil(b); x++) px(x, y, c); }
  }
}

// ---------- vector stroke font (uppercase, 4x6 grid, y down) ----------
// each glyph: strokes; a stroke is "x0,y0 x1,y1 ..." or "DOT x,y" (filled disc)
const FONT: Record<string, string[]> = {
  A: ["0,6 2,0 4,6", "1,4 3,4"], B: ["0,0 0,6", "0,0 3,0 4,1 4,2 3,3 0,3", "0,3 3,3 4,4 4,5 3,6 0,6"],
  C: ["4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5"], D: ["0,0 0,6", "0,0 3,0 4,1 4,5 3,6 0,6"],
  E: ["4,0 0,0 0,6 4,6", "0,3 3,3"], F: ["4,0 0,0 0,6", "0,3 3,3"],
  G: ["4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,3 2,3"], H: ["0,0 0,6", "4,0 4,6", "0,3 4,3"],
  I: ["1,0 3,0", "2,0 2,6", "1,6 3,6"], J: ["2,0 4,0 4,5 3,6 1,6 0,5"],
  K: ["0,0 0,6", "4,0 0,3 4,6"], L: ["0,0 0,6 4,6"], M: ["0,6 0,0 2,3 4,0 4,6"],
  N: ["0,6 0,0 4,6 4,0"], O: ["1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0"],
  P: ["0,6 0,0 3,0 4,1 4,2 3,3 0,3"], Q: ["1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0", "2,4 4,6"],
  R: ["0,6 0,0 3,0 4,1 4,2 3,3 0,3", "2,3 4,6"],
  S: ["4,1 3,0 1,0 0,1 0,2 1,3 3,3 4,4 4,5 3,6 1,6 0,5"], T: ["0,0 4,0", "2,0 2,6"],
  U: ["0,0 0,5 1,6 3,6 4,5 4,0"], V: ["0,0 2,6 4,0"], W: ["0,0 1,6 2,3 3,6 4,0"],
  X: ["0,0 4,6", "4,0 0,6"], Y: ["0,0 2,3 4,0", "2,3 2,6"], Z: ["0,0 4,0 0,6 4,6"],
  "0": ["1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0"], "1": ["1,1 2,0 2,6", "0,6 4,6"],
  "2": ["0,1 1,0 3,0 4,1 4,2 0,6 4,6"],
  "3": ["0,1 1,0 3,0 4,1 4,2 3,3", "3,3 4,4 4,5 3,6 1,6 0,5"],
  "4": ["0,0 0,3 4,3", "3,0 3,6"], "5": ["4,0 0,0 0,3 3,3 4,4 4,5 3,6 0,6"],
  "6": ["4,1 3,0 1,0 0,1 0,5 1,6 3,6 4,5 4,4 3,3 1,3 0,4"], "7": ["0,0 4,0 2,6"],
  "8": ["1,0 3,0 4,1 4,2 3,3 1,3 0,2 0,1", "0,4 1,3 3,3 4,4 4,5 3,6 1,6 0,5"],
  "9": ["0,5 0,2 1,0 3,0 4,1 4,5 3,6 1,6 0,5"],
  " ": [], "•": ["DOT 2,3"], ".": ["DOT 2,6"], ":": ["DOT 2,2", "DOT 2,5"],
  ",": ["DOT 2,5", "2,5 1,6"], "/": ["4,0 0,6"], "-": ["0,3 4,3"], "+": ["2,1 2,5", "0,3 4,3"],
  "%": ["0,1 1,0 1,1 0,2", "4,0 0,6", "3,5 4,4 4,5 3,6"],
  $: ["2,0 2,6", "4,1 3,0 1,0 0,2 1,3 3,3 4,4 3,6 1,6 0,5"],
  "'": ["2,0 2,2"], "(": ["3,0 2,1 1,3 2,5 3,6"], ")": ["1,0 2,1 3,3 2,5 1,6"],
  "~": ["0,3 1,2 2,3 3,4 4,3"], "&": ["3,0 1,2 0,3 1,5 3,5 4,6 2,4 0,6"],
};
// advance per char in grid units (5 = 4 wide + 1 gap)
function charAdv(): number { return 5; }
function textWidth(s: string, size: number): number {
  const sc = size / 6, adv = charAdv() * sc + sc * 0.3;
  return s.toUpperCase().length * adv - sc * 0.3;
}
function drawGlyph(ch: string, x: number, y: number, size: number, sw: number, c: number, vert = false) {
  const sc = size / 6;
  const strokes = FONT[ch] ?? [];
  for (const st of strokes) {
    if (st.startsWith("DOT")) {
      const parts = st.split(/[ ,]+/);
      const dx = +parts[1], dy = +parts[2];
      if (vert) disc(x + dy * sc, y - dx * sc, Math.max(1, sw * 0.55), c);
      else disc(x + dx * sc, y + dy * sc, Math.max(1, sw * 0.55), c);
      continue;
    }
    const pts = st.split(" ").map((p) => p.split(",").map(Number));
    for (let i = 0; i + 1 < pts.length; i++) {
      if (vert) tline(x + pts[i][1] * sc, y - pts[i][0] * sc, x + pts[i + 1][1] * sc, y - pts[i + 1][0] * sc, sw, c);
      else tline(x + pts[i][0] * sc, y + pts[i][1] * sc, x + pts[i + 1][0] * sc, y + pts[i + 1][1] * sc, sw, c);
    }
  }
}
// draw text; x,y = top-left of cap height; vert = bottom-to-top vertical text
function text(s: string, x: number, y: number, size: number, c: number, sw: number, vert = false) {
  const up = s.toUpperCase();
  const sc = size / 6, adv = charAdv() * sc + sc * 0.3;
  let cx = x, cy = y;
  for (const ch of up) {
    drawGlyph(ch, cx, cy, size, sw, c, vert);
    if (vert) cy -= adv; else cx += adv;
  }
}
function textC(s: string, cx: number, y: number, size: number, c: number, sw: number) {
  text(s, cx - textWidth(s, size) / 2, y, size, c, sw);
}
function textR(s: string, rx: number, y: number, size: number, c: number, sw: number) {
  text(s, rx - textWidth(s, size), y, size, c, sw);
}
function wrap(s: string, maxW: number, size: number): string[] {
  const words = s.toUpperCase().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (textWidth(t, size) <= maxW) cur = t;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function linesOut(lines: string[], x: number, y: number, size: number, pitch: number, c: number, sw: number) {
  lines.forEach((l, i) => text(l, x, y + i * pitch, size, c, sw));
}

// ---------- PNG encoder (deterministic) ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- scene: FLIGHT RECORDER — ONE DAY, THREE BEATS ----------
// Layout (1024x1024): header 32..160, rail x48..192 y164..976,
// leads: COP31 (212,164,764,190), Dymer (212,366,370,230), Cikande (598,366,378,230),
// cards 2 rows x 4 (182x174) at y608 / y794, bottom strip y972..1010.

function panel(x: number, y: number, w: number, h: number, status: number) {
  rect(x, y, w, h, PANEL);
  rect(x, y, 8, h, status); // status bar (form, not colour alone)
  rect(x, y, w, 2, status);
}
function dashedRect(x: number, y: number, w: number, h: number, c: number) {
  const seg = 8;
  for (let i = x; i < x + w; i += seg * 2) { hline(i, Math.min(i + seg, x + w), y, c); hline(i, Math.min(i + seg, x + w), y + h - 1, c); }
  for (let j = y; j < y + h; j += seg * 2) { vline(x, j, Math.min(j + seg, y + h), c); vline(x + w - 1, j, Math.min(j + seg, y + h), c); }
}
function chip(s: string, rx: number, y: number, size: number, kind: "fact" | "claim" | "dev"): number {
  const w = Math.ceil(textWidth(s, size)) + 18, h = 26, x = rx - w;
  if (kind === "fact") { rect(x, y, w, h, FACT); text(s, x + 9, y + 3, size, BG, 4); }
  if (kind === "claim") { rect(x, y, w, h, BG); rect(x, y, w, 2, CLAIM); rect(x, y + h - 2, w, 2, CLAIM); rect(x, y, 2, h, CLAIM); rect(x + w - 2, y, 2, h, CLAIM); text(s, x + 9, y + 3, size, CLAIM, 4); }
  if (kind === "dev") { rect(x, y, w, h, BG); dashedRect(x, y, w, h, DEV); text(s, x + 9, y + 3, size, DEV, 4); }
  return x - 10; // next chip's right edge
}

function header() {
  text("FLIGHT RECORDER", 48, 34, 30, INK, 5);
  textR("FINAL STATE • 23:55 UTC", 976, 38, 24, RAIL, 4);
  text("SUNDAY • 22 NOVEMBER 2026", 48, 80, 40, INK, 5);
  hline(48, 976, 150, MUTED);
}

function rail() {
  // vertical UTC rail, line x=120, ticks 00:00 / 06:00 / 12:00 / 18:00 / 23:55
  vline(120, 184, 944, RAIL);
  const ticks: [number, string][] = [[184, "00:00"], [374, "06:00"], [564, "12:00"], [754, "18:00"], [944, "23:55"]];
  for (const [ty, lab] of ticks) {
    hline(112, 128, ty, RAIL);
    text(lab, 130, ty - 9, 18, MUTED, 4);
    fillTri(120, ty - 7, 120, ty + 7, 134, ty, RAIL); // beat flag
  }
  // beat labels, vertical (bottom-to-top), left of the rail
  text("THE WOUNDS", 52, 370, 22, INK, 5, true);
  text("THE LONG WAIT", 52, 750, 18, INK, 4, true);
  text("WHAT REMAINS", 52, 940, 18, INK, 4, true);
  // verified-time nodes on the rail
  disc(120, 204, 7, FACT);   // Khartoum 00:00-02:30
  disc(120, 588, 7, FACT);   // Delta ground stop 12:46
  // disclaimer, bottom of the rail column
  text("CLOCK MARKS", 48, 962, 12, MUTED, 3);
  text("VERIFIED", 48, 978, 12, MUTED, 3);
  text("TIMES ONLY", 48, 994, 12, MUTED, 3);
}

function leadCOP31() {
  const x = 212, y = 164, w = 764;
  panel(x, y, w, 190, FACT);
  // globe motif, bottom-right
  ring(935, 332, 20, 4, RAIL);
  hline(915, 955, 332, RAIL); vline(935, 312, 352, RAIL);
  line(921, 318, 949, 346, RAIL); line(949, 318, 921, 346, RAIL);
  text("BEAT 2 • FACT • WORLD / ANTALYA", x + 20, y + 12, 18, MUTED, 3);
  text("A DAY ENDS WITHOUT A DEAL", x + 20, y + 36, 30, INK, 5);
  text("COP31 COLLAPSES", x + 20, y + 72, 36, INK, 6);
  text("EU + ~130 STATES REJECT FINAL TEXT", x + 20, y + 116, 20, INK, 4);
  text("NO FOSSIL-FUEL LANGUAGE", x + 20, y + 140, 20, INK, 4);
  text("$120BN TARGET DROPPED • 35% STAYS", x + 20, y + 164, 20, INK, 4);
}
function leadDymer() {
  const x = 212, y = 366, w = 370;
  panel(x, y, w, 230, FACT);
  // drone motif, top-right
  rect(533, 392, 26, 12, RAIL);
  disc(530, 390, 5, RAIL); disc(562, 390, 5, RAIL); disc(530, 406, 5, RAIL); disc(562, 406, 5, RAIL);
  line(546, 398, 530, 390, RAIL); line(546, 398, 562, 390, RAIL); line(546, 398, 530, 406, RAIL); line(546, 398, 562, 406, RAIL);
  text("BEAT 1 • FACT", x + 16, y + 12, 18, MUTED, 3);
  text("UKRAINE / DYMER", x + 16, y + 33, 18, MUTED, 3);
  text("2 HURT • 14", x + 16, y + 54, 28, INK, 5);
  text("FEARED TRAPPED", x + 16, y + 88, 28, INK, 5);
  text("APARTMENT BLOCK", x + 16, y + 122, 22, INK, 4);
  text("DESTROYED", x + 16, y + 148, 22, INK, 4);
  text("186 DRONES •", x + 16, y + 174, 22, INK, 4);
  text("161 DOWNED", x + 16, y + 200, 22, INK, 4);
}
function leadCikande() {
  const x = 598, y = 366, w = 378;
  panel(x, y, w, 230, FACT);
  // flame motif, top-right
  fillTri(935, 378, 918, 412, 952, 412, DEV);
  fillTri(935, 392, 926, 412, 944, 412, CLAIM);
  text("BEAT 1 • FACT", x + 16, y + 12, 18, MUTED, 3);
  text("CIKANDE / INDONESIA", x + 16, y + 33, 18, MUTED, 3);
  text("3 DEAD • 34", x + 16, y + 54, 32, INK, 5);
  text("MISSING", x + 16, y + 92, 32, INK, 5);
  text("FACTORY FIRE", x + 16, y + 128, 30, INK, 5);
  text("STATUS UNRESOLVED", x + 16, y + 162, 22, INK, 4);
  text("AT CLOSE", x + 16, y + 188, 22, INK, 4);
}

type Card = { status: number; label: string; head: string; details: string[] };
const CARDS: Card[] = [
  { status: FACT, label: "BEAT 1 • KHARTOUM", head: "4 KILLED", details: ["UN SITE HIT", "EARLY SUNDAY"] },
  { status: CLAIM, label: "BEAT 3 • BAHRAIN", head: "2 HURT IN SITRA FIRE", details: ["IRAN CLAIMS 2 TANKERS MINED"] },
  { status: DEV, label: "BEAT 3 • GAZA", head: "3 KILLED", details: ["AID WORKERS", "TALKS SOUGHT"] },
  { status: FACT, label: "BEAT 3 • TEHRAN", head: "ROLLING BLACKOUTS BEGIN", details: ["UP TO 2 HOURS A DAY"] },
  { status: FACT, label: "BEAT 2 • ATLANTA", head: "1,600+ FLIGHTS DELAYED", details: ["OUTAGE, NOT A HACK"] },
  { status: FACT, label: "BEAT 2 • HONG KONG", head: "856 FOR 723 SEATS", details: ["98.79% TURNOUT"] },
  { status: FACT, label: "BEAT 2 • WELLINGTON", head: "720/9 DECLARED", details: ["LEAD 352 RUNS"] },
  { status: FACT, label: "BEAT 3 • TURIN", head: "FIRST FINALS TITLE", details: ["BEATS ZVEREV 6-2"] },
];
function card(x: number, y: number, c: Card) {
  const w = 182, h = 174, inner = w - 24;
  panel(x, y, w, h, c.status);
  let cy = y + 14;
  const put = (l: string, size: number, pitch: number, col: number, sw: number) => {
    if (cy + size > y + h - 4) return; // clip: never spill below the panel
    text(l, x + 12, cy, size, col, sw); cy += pitch;
  };
  for (const l of wrap(c.label, inner, 15)) put(l, 15, 17, MUTED, 3);
  cy += 4;
  let hl = wrap(c.head, inner, 22), hs = 22;
  if (hl.length > 2) { hl = wrap(c.head, inner, 18); hs = 18; }
  for (const l of hl) put(l, hs, hs + 3, INK, 4);
  cy += 2;
  for (const d of c.details) for (const l of wrap(d, inner, 15)) put(l, 15, 17, INK, 3);
}
function cards() {
  const xs = [212, 406, 600, 794];
  for (let i = 0; i < 4; i++) card(xs[i], 608, CARDS[i]);
  for (let i = 0; i < 4; i++) card(xs[i], 794, CARDS[4 + i]);
}

function bottomStrip() {
  text("ONE DAY • THREE BEATS", 212, 980, 20, INK, 4);
  let rx = 976;
  rx = chip("DEVELOPING", rx, 976, 20, "dev");
  rx = chip("CLAIM", rx, 976, 20, "claim");
  rx = chip("FACT", rx, 976, 20, "fact");
}

function main() {
  rect(0, 0, W, H, BG);
  header();
  rail();
  leadCOP31();
  leadDymer();
  leadCikande();
  cards();
  bottomStrip();
  mkdirSync("out", { recursive: true });
  writeFileSync("entry.png", encodePNG());
  writeFileSync("out/entry.png", encodePNG());
  console.log("wrote entry.png");
}
main();
