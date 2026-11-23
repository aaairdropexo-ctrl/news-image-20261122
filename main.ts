// The World in One Day — Sunday 22 November 2026.
// A one-page newspaper drawn entirely in code (Node 22, stdlib only) and
// written to /output/entry.png. Deterministic: no clock, no random numbers,
// no network. Every story on the page happened, or was first reported, on
// Sunday 22 November 2026; stories from other days are named only in the
// DATE CHECK box, as left out on purpose.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase, digits, punctuation). Each glyph is 7 rows of
// 5 bits, written as strings so a bad glyph is visible at a glance.
// ---------------------------------------------------------------------------
type Glyph = string[];
const FONT: Record<string, Glyph> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '*': ['00000', '10101', '01110', '11111', '01110', '10101', '00000'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
};

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const PAPER = [246, 239, 221];
const INK = [20, 20, 20];
const WHITE = [255, 253, 246];
const NAVY = [20, 33, 61];
const RED = [179, 32, 44];
const GREY = [110, 108, 100];
const LIGHTGREY = [214, 206, 188];
const SKY_NIGHT = [16, 24, 48];
const SKY_DAY = [135, 178, 205];
const SEA = [38, 84, 124];

const REGION_COLORS: Record<string, number[]> = {
  EUROPE: [31, 92, 139],
  'MIDDLE EAST': [166, 43, 31],
  'ASIA-PACIFIC': [183, 121, 31],
  AMERICAS: [46, 125, 91],
  AFRICA: [122, 74, 33],
  OCEANIA: [91, 74, 138],
  WORLD: [68, 68, 68],
};

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with tiny vector-ish drawing helpers.
// ---------------------------------------------------------------------------
class Canvas {
  data = new Uint8Array(W * H * 3);
  constructor() {
    for (let i = 0; i < W * H; i++) {
      this.data[i * 3] = PAPER[0];
      this.data[i * 3 + 1] = PAPER[1];
      this.data[i * 3 + 2] = PAPER[2];
    }
  }
  px(x: number, y: number, c: number[]): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: number[]): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
  }
  border(x: number, y: number, w: number, h: number, c: number[], t = 1): void {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }
  hline(x: number, y: number, w: number, c: number[], t = 1): void {
    this.rect(x, y, w, t, c);
  }
  vline(x: number, y: number, h: number, c: number[], t = 1): void {
    this.rect(x, y, t, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.px(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }
  circle(cx: number, cy: number, r: number, c: number[]): void {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) this.px(cx + x, cy + y, c);
  }
  ring(cx: number, cy: number, r: number, c: number[]): void {
    for (let a = 0; a < 360; a += 2) {
      const t = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
    }
  }
  // Filled triangle.
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
    const minX = Math.min(x0, x1, x2);
    const maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
        const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
        const cc = 1 - a - b;
        if (a >= 0 && b >= 0 && cc >= 0) this.px(x, y, c);
      }
  }
  // Filled polygon (scanline, even-odd).
  poly(pts: number[][], c: number[]): void {
    let minY = H;
    let maxY = 0;
    for (const p of pts) {
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(Math.round(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = xs[k]; x <= xs[k + 1]; x++) this.px(x, y, c);
    }
  }
  // Note: no fake-bold pass. Drawing each lit pixel twice, offset by one
  // pixel, smears neighbouring columns into each other at every scale, so
  // weight comes from size and colour instead of a bold flag (kept only so
  // call sites need no change).
  text(str: string, x: number, y: number, scale: number, c: number[], _bold = false): number {
    let cx = x;
    const up = str.toUpperCase();
    for (const ch of up) {
      const g = FONT[ch] ?? FONT[' '];
      for (let r = 0; r < 7; r++)
        for (let col = 0; col < 5; col++)
          if (g[r][col] === '1') this.rect(cx + col * scale, y + r * scale, scale, scale, c);
      cx += 6 * scale;
    }
    return cx - x;
  }
  textW(str: string, scale: number): number {
    return str.length * 6 * scale - scale;
  }
  // Centre text on cx.
  textC(str: string, cx: number, y: number, scale: number, c: number[], bold = false): void {
    this.text(str, Math.round(cx - this.textW(str, scale) / 2), y, scale, c, bold);
  }
}

// Word-wrap into lines of at most maxChars characters. Long words split.
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      if (w.length <= maxChars) cur = w;
      else {
        for (let i = 0; i < w.length; i += maxChars) lines.push(w.slice(i, i + maxChars));
      }
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      if (w.length <= maxChars) cur = w;
      else {
        for (let i = 0; i < w.length; i += maxChars) lines.push(w.slice(i, i + maxChars));
        cur = '';
      }
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder (stdlib zlib). Filter 0 on every scanline; CRC32 table built
// at runtime so the bytes are identical on every run.
// ---------------------------------------------------------------------------
function crc32(buf: Buffer): number {
  let table = (crc32 as unknown as { t?: Int32Array }).t;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as unknown as { t?: Int32Array }).t = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(cv.data.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Drawn scenes. Each scene is drawn from fractions of its box so the same
// code serves the big lead pictures and the small card pictures. All shapes
// are flat geometric primitives; no photo, no copied artwork.
// ---------------------------------------------------------------------------
function drone(cv: Canvas, cx: number, cy: number, s: number, c: number[]): void {
  cv.rect(cx - s, cy - 1, 2 * s + 1, 3, c);
  cv.rect(cx - 1, cy - s, 3, 2 * s + 1, c);
  cv.circle(cx - s, cy - s, Math.max(2, Math.floor(s / 2)), c);
  cv.circle(cx + s, cy - s, Math.max(2, Math.floor(s / 2)), c);
  cv.circle(cx - s, cy + s, Math.max(2, Math.floor(s / 2)), c);
  cv.circle(cx + s, cy + s, Math.max(2, Math.floor(s / 2)), c);
}

function flame(cv: Canvas, cx: number, base: number, w: number, h: number): void {
  cv.tri(cx - w / 2, base, cx + w / 2, base, cx, base - h, [230, 120, 30]);
  cv.tri(cx - w / 4, base, cx + w / 4, base, cx, base - (h * 2) / 3, [250, 200, 40]);
}

function stars(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const pts: number[][] = [
    [0.08, 0.15], [0.22, 0.08], [0.35, 0.2], [0.5, 0.1], [0.63, 0.18],
    [0.78, 0.07], [0.9, 0.2], [0.15, 0.35], [0.45, 0.3], [0.7, 0.35],
    [0.85, 0.45], [0.3, 0.5], [0.58, 0.48],
  ];
  for (const p of pts) cv.px(Math.round(x + p[0] * w), Math.round(y + p[1] * h), [240, 240, 220]);
}

function drawScene(cv: Canvas, kind: string, x: number, y: number, w: number, h: number): void {
  const X = (f: number): number => Math.round(x + f * w);
  const Y = (f: number): number => Math.round(y + f * h);
  const WIN = [250, 210, 90];
  if (kind === 'summit') {
    cv.rect(x, y, w, Math.round(h * 0.62), [232, 150, 80]);
    cv.rect(x, y + Math.round(h * 0.62), w, h - Math.round(h * 0.62), [120, 90, 60]);
    cv.circle(X(0.78), Y(0.2), Math.max(5, Math.round(h * 0.09)), [250, 220, 130]);
    cv.rect(X(0.12), Y(0.42), Math.round(w * 0.62), Math.round(h * 0.3), [40, 48, 70]);
    cv.tri(X(0.08), Y(0.42), X(0.78), Y(0.42), X(0.43), Y(0.26), [30, 36, 54]);
    for (let i = 0; i < 5; i++) cv.rect(X(0.17 + i * 0.11), Y(0.5), Math.round(w * 0.05), Math.round(h * 0.14), WIN);
    for (let i = 0; i < 6; i++) {
      const fx = 0.12 + i * 0.13;
      cv.vline(X(fx), Y(0.78), Math.round(h * 0.16), INK);
      cv.rect(X(fx), Y(0.74), Math.round(w * 0.07), Math.round(h * 0.05), i % 2 ? RED : [31, 92, 139]);
    }
  } else if (kind === 'drones') {
    cv.rect(x, y, w, h, SKY_NIGHT);
    stars(cv, x, y, w, Math.round(h * 0.55));
    drone(cv, X(0.2), Y(0.2), Math.max(4, Math.round(w * 0.03)), [250, 200, 60]);
    drone(cv, X(0.55), Y(0.12), Math.max(4, Math.round(w * 0.03)), [250, 200, 60]);
    drone(cv, X(0.82), Y(0.28), Math.max(4, Math.round(w * 0.03)), [250, 200, 60]);
    cv.poly([[X(0.62), Y(0.55)], [X(0.72), Y(0.55)], [X(0.9), Y(1)], [X(0.5), Y(1)]], [200, 200, 170]);
    cv.rect(X(0.06), Y(0.55), Math.round(w * 0.34), Math.round(h * 0.45), [30, 32, 44]);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) cv.rect(X(0.1 + c * 0.08), Y(0.6 + r * 0.13), Math.max(2, Math.round(w * 0.03)), Math.max(2, Math.round(h * 0.05)), WIN);
    cv.poly([[X(0.44), Y(0.62)], [X(0.56), Y(0.58)], [X(0.6), Y(1)], [X(0.42), Y(1)]], [52, 54, 66]);
    flame(cv, X(0.5), Y(0.98), Math.round(w * 0.1), Math.round(h * 0.3));
  } else if (kind === 'radar') {
    cv.rect(x, y, w, Math.round(h * 0.7), SKY_NIGHT);
    stars(cv, x, y, w, Math.round(h * 0.4));
    cv.rect(x, y + Math.round(h * 0.7), w, h - Math.round(h * 0.7), SEA);
    cv.circle(X(0.22), Y(0.42), Math.max(6, Math.round(w * 0.06)), [160, 170, 180]);
    cv.line(X(0.22), Y(0.42), X(0.22), Y(0.72), [160, 170, 180]);
    cv.circle(X(0.6), Y(0.38), Math.max(6, Math.round(w * 0.06)), [160, 170, 180]);
    cv.line(X(0.6), Y(0.38), X(0.6), Y(0.72), [160, 170, 180]);
    flame(cv, X(0.85), Y(0.72), Math.round(w * 0.1), Math.round(h * 0.34));
    cv.rect(X(0.78), Y(0.72), Math.round(w * 0.14), Math.round(h * 0.1), [40, 44, 52]);
  } else if (kind === 'tanker') {
    cv.rect(x, y, w, Math.round(h * 0.55), SKY_DAY);
    cv.circle(X(0.85), Y(0.18), Math.max(5, Math.round(h * 0.1)), [250, 230, 150]);
    cv.rect(x, y + Math.round(h * 0.55), w, h - Math.round(h * 0.55), SEA);
    cv.rect(X(0.08), Y(0.6), Math.round(w * 0.6), Math.round(h * 0.22), [30, 32, 40]);
    cv.tri(X(0.68), Y(0.6), X(0.68), Y(0.82), X(0.86), Y(0.82), [30, 32, 40]);
    cv.rect(X(0.12), Y(0.46), Math.round(w * 0.14), Math.round(h * 0.14), RED);
    cv.rect(X(0.28), Y(0.46), Math.round(w * 0.14), Math.round(h * 0.14), [31, 92, 139]);
    cv.rect(X(0.44), Y(0.46), Math.round(w * 0.14), Math.round(h * 0.14), [183, 121, 31]);
    flame(cv, X(0.52), Y(0.48), Math.round(w * 0.12), Math.round(h * 0.36));
    cv.circle(X(0.58), Y(0.3), Math.max(3, Math.round(h * 0.05)), [120, 120, 115]);
    cv.circle(X(0.63), Y(0.22), Math.max(3, Math.round(h * 0.05)), [140, 140, 135]);
  } else if (kind === 'fire') {
    cv.rect(x, y, w, h, [60, 40, 36]);
    cv.rect(X(0.12), Y(0.3), Math.round(w * 0.6), Math.round(h * 0.7), [90, 70, 60]);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) cv.rect(X(0.17 + c * 0.14), Y(0.36 + r * 0.2), Math.max(2, Math.round(w * 0.06)), Math.max(2, Math.round(h * 0.08)), r === 0 ? WIN : [60, 50, 44]);
    flame(cv, X(0.45), Y(0.34), Math.round(w * 0.34), Math.round(h * 0.55));
    flame(cv, X(0.82), Y(0.5), Math.round(w * 0.2), Math.round(h * 0.34));
    cv.circle(X(0.85), Y(0.2), Math.max(3, Math.round(h * 0.06)), [130, 130, 125]);
  } else if (kind === 'vote') {
    cv.rect(x, y, w, h, [240, 235, 220]);
    cv.rect(X(0.14), Y(0.3), Math.round(w * 0.42), Math.round(h * 0.5), [31, 92, 139]);
    cv.rect(X(0.1), Y(0.24), Math.round(w * 0.5), Math.round(h * 0.08), [24, 70, 105]);
    cv.rect(X(0.28), Y(0.26), Math.round(w * 0.14), Math.round(h * 0.03), INK);
    cv.rect(X(0.62), Y(0.14), Math.round(w * 0.26), Math.round(h * 0.34), WHITE);
    cv.border(X(0.62), Y(0.14), Math.round(w * 0.26), Math.round(h * 0.34), INK);
    cv.line(X(0.66), Y(0.32), X(0.72), Y(0.42), [30, 140, 60]);
    cv.line(X(0.72), Y(0.42), X(0.86), Y(0.18), [30, 140, 60]);
    cv.circle(X(0.82), Y(0.68), Math.max(5, Math.round(h * 0.12)), RED);
  } else if (kind === 'f1') {
    cv.rect(x, y, w, h, [24, 24, 30]);
    cv.rect(x, y + Math.round(h * 0.62), w, Math.round(h * 0.2), [70, 70, 78]);
    for (let i = 0; i < 8; i++) cv.rect(X(0.06 + i * 0.12), Y(0.66), Math.max(3, Math.round(w * 0.05)), Math.max(2, Math.round(h * 0.04)), i % 2 ? [200, 200, 200] : [220, 40, 40]);
    cv.rect(X(0.2), Y(0.42), Math.round(w * 0.5), Math.round(h * 0.16), RED);
    cv.rect(X(0.38), Y(0.3), Math.round(w * 0.2), Math.round(h * 0.14), [200, 30, 30]);
    cv.circle(X(0.28), Y(0.6), Math.max(3, Math.round(h * 0.07)), INK);
    cv.circle(X(0.62), Y(0.6), Math.max(3, Math.round(h * 0.07)), INK);
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 4; c++) cv.rect(X(0.8 + c * 0.045), Y(0.1 + r * 0.09), Math.max(2, Math.round(w * 0.04)), Math.max(2, Math.round(h * 0.08)), (r + c) % 2 ? INK : WHITE);
  } else if (kind === 'cricket') {
    cv.rect(x, y, w, h, [90, 150, 80]);
    cv.rect(X(0.38), Y(0.08), Math.round(w * 0.24), h - Math.round(h * 0.08), [210, 190, 150]);
    for (let i = 0; i < 3; i++) cv.vline(X(0.46 + i * 0.04), Y(0.14), Math.round(h * 0.12), [250, 230, 140], 2);
    cv.line(X(0.2), Y(0.7), X(0.34), Y(0.42), [120, 80, 40]);
    cv.rect(X(0.32), Y(0.36), Math.max(3, Math.round(w * 0.03)), Math.round(h * 0.1), [120, 80, 40]);
    cv.circle(X(0.72), Y(0.3), Math.max(3, Math.round(h * 0.06)), [180, 30, 30]);
  } else if (kind === 'tennis') {
    cv.rect(x, y, w, h, [52, 96, 160]);
    cv.rect(X(0.1), Y(0.12), Math.round(w * 0.8), Math.round(h * 0.76), [70, 130, 200]);
    cv.border(X(0.1), Y(0.12), Math.round(w * 0.8), Math.round(h * 0.76), WHITE);
    cv.hline(X(0.1), Y(0.5), Math.round(w * 0.8), WHITE);
    cv.vline(X(0.5), Y(0.12), Math.round(h * 0.76), WHITE);
    cv.circle(X(0.72), Y(0.28), Math.max(3, Math.round(h * 0.08)), [200, 230, 60]);
    cv.circle(X(0.28), Y(0.72), Math.max(3, Math.round(h * 0.07)), [200, 230, 60]);
  } else if (kind === 'football') {
    cv.rect(x, y, w, h, [46, 130, 70]);
    for (let i = 0; i < 4; i++) cv.rect(X(i * 0.25), y, Math.round(w * 0.125), h, [56, 148, 82]);
    cv.rect(X(0.62), Y(0.14), Math.round(w * 0.3), Math.round(h * 0.4), WHITE);
    cv.border(X(0.62), Y(0.14), Math.round(w * 0.3), Math.round(h * 0.4), WHITE, 2);
    cv.rect(X(0.66), Y(0.2), Math.round(w * 0.22), Math.round(h * 0.28), [46, 130, 70]);
    cv.circle(X(0.3), Y(0.62), Math.max(4, Math.round(h * 0.1)), WHITE);
    cv.circle(X(0.3), Y(0.62), Math.max(2, Math.round(h * 0.04)), INK);
  } else if (kind === 'plane') {
    cv.rect(x, y, w, Math.round(h * 0.7), SKY_DAY);
    cv.circle(X(0.82), Y(0.18), Math.max(5, Math.round(h * 0.09)), [250, 230, 150]);
    cv.rect(x, y + Math.round(h * 0.7), w, h - Math.round(h * 0.7), [90, 90, 96]);
    cv.rect(X(0.14), Y(0.3), Math.round(w * 0.56), Math.round(h * 0.16), WHITE);
    cv.tri(X(0.7), Y(0.3), X(0.7), Y(0.46), X(0.88), Y(0.46), WHITE);
    cv.tri(X(0.34), Y(0.3), X(0.52), Y(0.3), X(0.44), Y(0.14), WHITE);
    cv.tri(X(0.34), Y(0.46), X(0.52), Y(0.46), X(0.44), Y(0.62), WHITE);
    cv.rect(X(0.1), Y(0.34), Math.round(w * 0.06), Math.round(h * 0.08), [31, 92, 139]);
    for (let i = 0; i < 5; i++) cv.rect(X(0.12 + i * 0.16), Y(0.84), Math.round(w * 0.08), Math.max(1, Math.round(h * 0.03)), [220, 220, 210]);
  } else if (kind === 'khartoum') {
    cv.rect(x, y, w, Math.round(h * 0.6), [40, 44, 66]);
    cv.rect(x, y + Math.round(h * 0.6), w, h - Math.round(h * 0.6), [150, 130, 100]);
    cv.rect(X(0.08), Y(0.34), Math.round(w * 0.26), Math.round(h * 0.5), [70, 72, 84]);
    cv.rect(X(0.4), Y(0.26), Math.round(w * 0.3), Math.round(h * 0.58), [86, 88, 100]);
    for (let i = 0; i < 4; i++) cv.rect(X(0.44 + i * 0.06), Y(0.32), Math.max(2, Math.round(w * 0.03)), Math.max(2, Math.round(h * 0.05)), WIN);
    drone(cv, X(0.78), Y(0.2), Math.max(4, Math.round(w * 0.03)), [250, 200, 60]);
    cv.circle(X(0.56), Y(0.3), Math.max(3, Math.round(h * 0.06)), [130, 130, 125]);
    cv.circle(X(0.62), Y(0.2), Math.max(3, Math.round(h * 0.06)), [150, 150, 145]);
    flame(cv, X(0.82), Y(0.86), Math.round(w * 0.12), Math.round(h * 0.26));
  } else if (kind === 'power') {
    cv.rect(x, y, w, Math.round(h * 0.65), SKY_NIGHT);
    stars(cv, x, y, w, Math.round(h * 0.4));
    cv.rect(x, y + Math.round(h * 0.65), w, h - Math.round(h * 0.65), [40, 40, 48]);
    cv.line(X(0.5), Y(0.1), X(0.5), Y(0.9), [150, 150, 150]);
    cv.line(X(0.5), Y(0.2), X(0.3), Y(0.55), [150, 150, 150]);
    cv.line(X(0.5), Y(0.2), X(0.7), Y(0.55), [150, 150, 150]);
    cv.line(X(0.3), Y(0.55), X(0.7), Y(0.55), [150, 150, 150]);
    cv.poly([[X(0.24), Y(0.34)], [X(0.34), Y(0.34)], [X(0.26), Y(0.52)], [X(0.36), Y(0.52)], [X(0.2), Y(0.74)], [X(0.3), Y(0.5)], [X(0.22), Y(0.5)]], [250, 200, 40]);
    cv.rect(X(0.72), Y(0.55), Math.round(w * 0.2), Math.round(h * 0.3), [24, 26, 34]);
    cv.rect(X(0.76), Y(0.6), Math.max(2, Math.round(w * 0.03)), Math.max(2, Math.round(h * 0.05)), [60, 60, 60]);
  }
}

// ---------------------------------------------------------------------------
// The day's stories. Every fact below was checked against the wires on
// 23-24 Nov 2026 (Reuters, BBC, AP, AFP, Al Jazeera, The Guardian, ATP, F1,
// Cricbuzz, Hong Kong Govt, Ukrainian Air Force). Numbers are the figures
// reported on Sunday 22 November itself, not later revisions: the Cikande
// toll is 3 dead and 34 missing as reported that Sunday; the 24 confirmed
// dead came on Monday. The ICJ genocide ruling was 19 Nov, the El Chapo
// Isidro arrest 20 Nov, the Kryvyi Rih strike 20-21 Nov — all three are
// named only in the DATE CHECK box, as left out.
// ---------------------------------------------------------------------------
type Lead = { n: number; place: string; beat: string; region: string; tag: string; head: string; body: string; src: string; scene: string };
type Card = { n: number; place: string; beat: string; region: string; tag: string; head: string; body: string; scene: string };

const LEADS: Lead[] = [
  {
    n: 1, place: 'ANTALYA, TURKIYE', beat: 'CLIMATE', region: 'WORLD', tag: 'REPORTED',
    head: 'COP31 ENDS WITH NO FOSSIL FUELS',
    body: 'EU and 130 nations refuse it. The longest COP ever ends with no pact.',
    src: 'REUTERS - BBC - THE GUARDIAN', scene: 'summit',
  },
  {
    n: 2, place: 'KYIV REGION, UKRAINE', beat: 'WAR', region: 'EUROPE', tag: 'REPORTED',
    head: 'RUSSIA FIRES 186 DRONES AT UKRAINE',
    body: '161 downed. Block in Dymer falls, 14 trapped. Zelenskyy asks US for Patriots.',
    src: 'UKRAINIAN AIR FORCE - REUTERS', scene: 'drones',
  },
  {
    n: 3, place: 'MANAMA, BAHRAIN', beat: 'IRAN', region: 'MIDDLE EAST', tag: 'CLAIM',
    head: 'IRAN CLAIMS TWO US RADARS HIT',
    body: 'Bahrain says a site burned, 2 hurt. The US says its forces took no damage.',
    src: 'IRGC - BAHRAIN MOI - AL JAZEERA', scene: 'radar',
  },
];

const CARDS: Card[] = [
  { n: 4, place: 'HORMUZ', beat: 'SEA', region: 'MIDDLE EAST', tag: 'CLAIM', head: 'TANKERS HIT MINES AT HORMUZ', body: 'IRAN SAYS BOTH CAUGHT FIRE.', scene: 'tanker' },
  { n: 5, place: 'CIKANDE', beat: 'FIRE', region: 'ASIA-PACIFIC', tag: 'REPORTED', head: 'CANDY-FACTORY FIRE IN CIKANDE', body: '3 DEAD, 34 MISSING.', scene: 'fire' },
  { n: 6, place: 'HONG KONG', beat: 'ELECTION', region: 'ASIA-PACIFIC', tag: 'REPORTED', head: 'HONG KONG VOTES', body: '856 FOR 723 SEATS.', scene: 'vote' },
  { n: 7, place: 'LAS VEGAS', beat: 'F1', region: 'AMERICAS', tag: 'REPORTED', head: 'VERSTAPPEN WINS IN VEGAS', body: 'BY 0.639S OVER NORRIS.', scene: 'f1' },
  { n: 8, place: 'WELLINGTON', beat: 'CRICKET', region: 'OCEANIA', tag: 'REPORTED', head: 'INDIA DECLARE ON 720/9', body: 'RAHUL 136, PANT 128.', scene: 'cricket' },
  { n: 9, place: 'TURIN', beat: 'TENNIS', region: 'EUROPE', tag: 'REPORTED', head: 'ALCARAZ WINS ATP FINALS', body: 'BEATS ZVEREV 6-2, 7-6(7).', scene: 'tennis' },
  { n: 10, place: 'LIVERPOOL', beat: 'SOCCER', region: 'EUROPE', tag: 'REPORTED', head: 'LIVERPOOL 4-0 MAN UTD', body: 'YORO OFF IN 8 MINS.', scene: 'football' },
  { n: 11, place: 'ATLANTA', beat: 'TRAVEL', region: 'AMERICAS', tag: 'REPORTED', head: 'DELTA OUTAGE DELAYS 1,600+', body: 'ATLANTA GROUND STOP.', scene: 'plane' },
  { n: 12, place: 'KHARTOUM', beat: 'WAR', region: 'AFRICA', tag: 'REPORTED', head: 'UN SITE HIT IN KHARTOUM', body: '4 KILLED. ARMY BLAMES ETHIOPIA', scene: 'khartoum' },
  { n: 13, place: 'TEHRAN', beat: 'ENERGY', region: 'MIDDLE EAST', tag: 'REPORTED', head: 'IRAN STARTS POWER RATIONING', body: 'CUTS OF UP TO 2 HOURS A DAY.', scene: 'power' },
];

// One line each, at most 54 characters. Number, region and text.
const ALSO: { n: number; region: string; text: string }[] = [
  { n: 14, region: 'MIDDLE EAST', text: 'GAZA: HAMAS SEEKS TALKS AFTER STRIKE KILLS 3 AID STAFF' },
  { n: 15, region: 'ASIA-PACIFIC', text: 'MALAYSIA BACKS ICJ GENOCIDE RULING (VERDICT 19 NOV)' },
  { n: 16, region: 'AFRICA', text: 'NIGERIA BOAT TOLL RISES TO 24; 24 RESCUED' },
  { n: 17, region: 'AMERICAS', text: 'TRUMP WEIGHS NEW IRAN STRIKES AFTER NEW YEAR' },
  { n: 18, region: 'AMERICAS', text: "WEMBANYAMA 50 AS SPURS BEAT PELICANS 114-91" },
  { n: 19, region: 'WORLD', text: 'COP31: 90 NATIONS BACK CLEAN-POWER PLEDGE' },
  { n: 20, region: 'EUROPE', text: 'ODESA GRID FAILS AFTER STRIKES; DRONE ENTERS MOLDOVA' },
  { n: 21, region: 'EUROPE', text: 'POPE LEO XIV HOSTS 1,300 POOR GUESTS IN VATICAN' },
  { n: 22, region: 'AMERICAS', text: 'BOLSONARO IN INTENSIVE CARE; STABLE, SAY DOCTORS' },
  { n: 23, region: 'ASIA-PACIFIC', text: 'SNOW STRANDS ABOUT 1,500 IN JAPAN VILLAGE' },
  { n: 24, region: 'WORLD', text: 'BEPICOLOMBO ENTERS MERCURY ORBIT AFTER 8 YEARS' },
  { n: 25, region: 'ASIA-PACIFIC', text: 'EU AND INDONESIA SIGN TRADE DEAL AFTER 10 YEARS' },
  { n: 26, region: 'EUROPE', text: 'COST-OF-LIVING PROTESTS ENTER DAY 3 IN EUROPE' },
  { n: 27, region: 'MIDDLE EAST', text: 'SAUDI SAYS IT DOWNED HOUTHI MISSILE OVER RIYADH' },
  { n: 28, region: 'ASIA-PACIFIC', text: 'NEPAL PM LANDS IN DELHI ON FIRST STATE VISIT' },
  { n: 29, region: 'EUROPE', text: 'DENMARK EXPELS RUSSIAN ATTACHE OVER ALLEGED PLOT' },
  { n: 30, region: 'EUROPE', text: 'ESTONIA TO SHUT 5 RUSSIA BORDER POSTS ON 1 DEC' },
  { n: 31, region: 'AFRICA', text: 'KENYA DISCHARGES ITS LAST EBOLA PATIENT' },
  { n: 32, region: 'AFRICA', text: 'RSF ACCUSED OF KILLING CIVILIANS IN W. KORDOFAN' },
  { n: 33, region: 'AFRICA', text: 'DR CONGO: CANTINE ATTACK KILLS 40' },
  { n: 34, region: 'ASIA-PACIFIC', text: 'JAPAN POLL: RECORD 92% FEEL FRIENDLY TO S. KOREA' },
  { n: 35, region: 'AMERICAS', text: "COLUMBUS BEAT MESSI'S INTER MIAMI 3-0" },
  { n: 36, region: 'OCEANIA', text: 'MELBOURNE: 70 YEARS SINCE 1956 OLYMPICS OPENED' },
];

const STATS: { num: string; label: string }[] = [
  { num: '186', label: "DRONES FIRED AT UKRAINE OVERNIGHT" },
  { num: '161', label: 'DOWNED OR JAMMED BY AIR DEFENCE' },
  { num: '720/9', label: "INDIA'S RECORD TEST TOTAL IN NZ" },
  { num: '1,600+', label: 'DELTA FLIGHTS DELAYED IN OUTAGE' },
  { num: '35%', label: 'CLEAN-POWER GOAL KEPT AT COP31' },
  { num: '50', label: 'WEMBANYAMA SCORES 50 FOR SPURS' },
];

const REGIONS: { name: string; count: number }[] = [
  { name: 'EUROPE', count: 8 },
  { name: 'MIDDLE EAST', count: 5 },
  { name: 'ASIA-PACIFIC', count: 7 },
  { name: 'AMERICAS', count: 6 },
  { name: 'AFRICA', count: 5 },
  { name: 'OCEANIA', count: 2 },
  { name: 'WORLD', count: 3 },
];

const TIMELINE =
  '00:00 KHARTOUM DRONES - 05:11 HAMAS SEEKS TALKS - 06:00 161/186 DOWNED - 12:46 DELTA STOP - 16:30 LIVERPOOL KO - EVE ALCARAZ WINS - NIGHT COP31 NO DEAL';

const DATECHECK =
  'LEFT OUT BECAUSE THEY HAPPENED ON AN EARLIER DAY: EL CHAPO ISIDRO ARREST FRI 20 NOV - ICJ MYANMAR GENOCIDE RULING THU 19 NOV - KRYVYI RIH STRIKE FRI 20-SAT 21 NOV - RUSSIA 400-DRONE BARRAGE THU 19-FRI 20 NOV - NVIDIA SEC PROBE FRI 20 NOV - SPARTA II HIT BY DRONES SAT 21 NOV - SHENZHEN LEADERS SUMMIT THU 19-FRI 20 NOV - MARKET FALL FRI 20 NOV';

const MAP_PINS: { n: number; x: number; y: number }[] = [
  { n: 1, x: 206, y: 44 }, { n: 2, x: 212, y: 22 }, { n: 3, x: 248, y: 58 },
  { n: 4, x: 264, y: 66 }, { n: 5, x: 296, y: 98 }, { n: 6, x: 302, y: 72 },
  { n: 7, x: 30, y: 52 }, { n: 8, x: 336, y: 152 }, { n: 9, x: 182, y: 38 },
  { n: 10, x: 166, y: 20 }, { n: 11, x: 52, y: 58 }, { n: 12, x: 204, y: 88 },
  { n: 16, x: 184, y: 98 },
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const MX = 14;
const CW = 996; // content width, x = MX .. MX+CW

function draw(): Canvas {
  const cv = new Canvas();

  // Top strip.
  cv.text('THE WORLD IN ONE DAY', MX, 9, 1, INK, true);
  const tr = '36 STORIES - 7 REGIONS - EVERY ONE DATED SUNDAY 22 NOVEMBER 2026';
  cv.text(tr, MX + CW - cv.textW(tr, 1), 9, 1, INK, true);
  cv.hline(MX, 24, CW, INK, 2);

  // Masthead.
  cv.textC('SUNDAY 22 NOVEMBER 2026', 512, 28, 6, INK, true);
  cv.hline(MX, 74, CW, INK, 2);

  // Deck.
  cv.textC('COP31 NO DEAL - 186 DRONES OVER UKRAINE - IRAN CLAIMS US RADARS HIT', 512, 78, 2, RED, true);
  cv.hline(MX, 96, CW, INK, 1);

  // Stat strip: 6 cells.
  const cellW = CW / 6;
  for (let i = 0; i < STATS.length; i++) {
    const x = MX + i * cellW;
    cv.textC(STATS[i].num, x + cellW / 2, 100, 4, RED, true);
    const labs = wrap(STATS[i].label, 26);
    labs.forEach((l, j) => cv.textC(l, x + cellW / 2, 130 + j * 9, 1, INK));
    if (i > 0) cv.vline(Math.round(x), 100, 44, LIGHTGREY);
  }
  cv.hline(MX, 146, CW, INK, 1);

  // Region bar.
  const segW = CW / REGIONS.length;
  REGIONS.forEach((r, i) => {
    const x = Math.round(MX + i * segW);
    cv.rect(x, 150, Math.round(segW), 18, REGION_COLORS[r.name]);
    cv.textC(`${r.name} ${r.count}`, x + segW / 2, 155, 1, WHITE, true);
  });

  // UTC timeline strip.
  cv.rect(MX, 172, CW, 16, NAVY);
  cv.textC(TIMELINE, 512, 175, 1, WHITE);

  // Leads: 3 columns.
  const leadW = 328;
  const leadX = [MX, MX + 334, MX + 668];
  LEADS.forEach((lead, i) => {
    const x = leadX[i];
    const y = 192;
    cv.border(x, y, leadW, 216, INK);
    drawScene(cv, lead.scene, x + 1, y + 1, leadW - 2, 78);
    const rc = REGION_COLORS[lead.region];
    cv.rect(x + 1, y + 79, leadW - 2, 3, rc);
    const kick = `${lead.n} ${lead.place} - ${lead.beat}`;
    cv.text(kick, x + 6, y + 86, 1, RED, true);
    cv.text(lead.tag, x + leadW - 6 - cv.textW(lead.tag, 1), y + 86, 1, lead.tag === 'CLAIM' ? RED : GREY, true);
    const headLines = wrap(lead.head, 17);
    headLines.forEach((l, j) => cv.text(l, x + 6, y + 98 + j * 23, 3, INK, true));
    const bodyLines = wrap(lead.body, 26);
    bodyLines.forEach((l, j) => cv.text(l, x + 6, y + 148 + j * 16, 2, INK));
  });

  // Grid: 5 columns x 2 rows of cards.
  const cardW = 195;
  const cardH = 120;
  CARDS.forEach((card, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = MX + col * 200;
    const y = 412 + row * 124;
    cv.border(x, y, cardW, cardH, INK);
    drawScene(cv, card.scene, x + 1, y + 1, cardW - 2, 40);
    const rc = REGION_COLORS[card.region];
    cv.rect(x + 1, y + 41, cardW - 2, 3, rc);
    const kick = `${card.n} ${card.place} - ${card.beat}`;
    cv.text(kick, x + 5, y + 47, 1, RED, true);
    cv.text(card.tag, x + cardW - 5 - cv.textW(card.tag, 1), y + 47, 1, card.tag === 'CLAIM' ? RED : GREY, true);
    const headLines = wrap(card.head, 15);
    headLines.forEach((l, j) => cv.text(l, x + 5, y + 58 + j * 17, 2, INK, true));
    const bodyLines = wrap(card.body, 15);
    bodyLines.forEach((l, j) => cv.text(l, x + 5, y + 90 + j * 15, 2, INK));
  });

  // Also list (left) + map (right).
  const ay = 660;
  cv.text('ALSO ON SUNDAY 22 NOVEMBER - 23 MORE STORIES', MX, ay, 2, INK, true);
  cv.hline(MX, ay + 16, 636, INK, 1);
  const colW = 314;
  const colX = [MX, MX + 322];
  let rowY = [ay + 22, ay + 22];
  ALSO.forEach((item, i) => {
    const col = i < 12 ? 0 : 1;
    const x = colX[col];
    let yy = rowY[col];
    const num = `${item.n}`;
    const numW = cv.text(num + ' ', x, yy, 1, REGION_COLORS[item.region], true);
    const lines = wrap(item.text, 50);
    lines.forEach((l, j) => {
      cv.text(l, x + numW, yy + j * 9, 1, INK);
    });
    rowY[col] = yy + lines.length * 9 + 2;
  });
  // Map.
  const mapX = 662;
  const mapY = ay;
  const mapW = 348;
  const mapH = 206;
  cv.text('WHERE IT HAPPENED - PINS MATCH STORY NUMBERS', mapX, ay, 1, INK, true);
  cv.border(mapX, ay + 16, mapW, mapH - 16, INK);
  const mX = mapX;
  const mY = ay + 16;
  cv.rect(mX + 1, mY + 1, mapW - 2, mapH - 18, [198, 220, 232]);
  const land: number[][][] = [
    [[12, 28], [70, 14], [108, 26], [102, 58], [66, 74], [28, 64], [10, 46]],
    [[84, 98], [118, 92], [128, 134], [106, 172], [88, 144]],
    [[176, 26], [204, 18], [220, 32], [208, 54], [182, 50]],
    [[182, 68], [220, 62], [236, 94], [214, 136], [192, 120], [176, 88]],
    [[226, 20], [308, 14], [342, 42], [318, 80], [264, 92], [236, 64], [226, 42]],
    [[312, 146], [344, 140], [348, 162], [318, 168]],
  ];
  for (const poly of land) cv.poly(poly.map((p) => [mX + 1 + p[0], mY + 1 + p[1]]), [222, 202, 162]);
  for (const pin of MAP_PINS) {
    const px = mX + 1 + pin.x;
    const py = mY + 1 + pin.y;
    cv.circle(px, py, 6, RED);
    const s = `${pin.n}`;
    cv.text(s, Math.round(px - cv.textW(s, 1) / 2), py - 3, 1, WHITE, true);
  }

  // Date check box.
  const dy = 872;
  cv.border(MX, dy, CW, 66, RED, 2);
  cv.text('DATE CHECK', MX + 8, dy + 6, 2, RED, true);
  const dcLines = wrap(DATECHECK, 158);
  dcLines.forEach((l, j) => cv.text(l, MX + 8, dy + 24 + j * 10, 1, INK));

  // Footer.
  cv.text('SOURCES: REUTERS - BBC - AP - AFP - AL JAZEERA - THE GUARDIAN - UKRAINIAN AIR FORCE - IRGC - BAHRAIN MOI - HK GOVT - ATP - F1 - CRICBUZZ - ESPN - VATICAN NEWS', MX, 944, 1, GREY);
  cv.text('CERTAINTY: REPORTED = CARRIED BY THE DAY WIRES - CLAIM = ONE SIDE ACCOUNT, LABELLED AS SUCH - SCENES ARE DRAWN ILLUSTRATIONS, NOT PHOTOGRAPHS', MX, 954, 1, GREY);
  cv.text('PRESS TIME 23:55 UTC - SUNDAY 22 NOVEMBER 2026', MX, 964, 1, GREY);

  // Bottom strip.
  cv.rect(MX, 974, CW, 36, NAVY);
  cv.text('THE WORLD IN ONE DAY', MX + 10, 987, 2, WHITE, true);
  const br = 'SUNDAY 22 NOVEMBER 2026 - ONE PAGE';
  cv.text(br, MX + CW - 10 - cv.textW(br, 2), 987, 2, WHITE, true);

  return cv;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  const png = encodePNG(draw());
  writeFileSync(join(outDir, 'entry.png'), png);
  console.log(`wrote entry.png ${png.length} bytes`);
}

main();
