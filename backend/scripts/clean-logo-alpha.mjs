/**
 * Cleans Mumbai Fitness Mafia logo PNG from the HD master export.
 * Removes dark background + anti-aliased fringe, outputs crisp transparent PNG.
 *
 * Usage:
 *   node scripts/clean-logo-alpha.mjs
 *   node scripts/clean-logo-alpha.mjs [source.png] [output.png]
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultSource = path.resolve(__dirname, '../../mobile/assets/images/Mumbai_fitness_mafia_logo.source.png');
const defaultOutput = path.resolve(__dirname, '../../mobile/assets/images/Mumbai_fitness_mafia_logo.png');
const fallbackSource = path.resolve(process.env.HOME || '', 'Downloads/Mumbai_Fitness_Mafia_Logo_HD.png');

const source = process.argv[2]
  ? path.resolve(process.argv[2])
  : fs.existsSync(defaultSource)
    ? defaultSource
    : fallbackSource;
const output = process.argv[3] ? path.resolve(process.argv[3]) : defaultOutput;

function metrics(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = (r + g + b) / 3;
  const sat = max === 0 ? 0 : chroma / max;
  return { max, min, chroma, lum, sat };
}

function isBackground(r, g, b) {
  const { chroma, lum, max } = metrics(r, g, b);
  return lum < 44 && (chroma < 52 || max < 52);
}

function isCore(r, g, b) {
  const { chroma, sat, lum } = metrics(r, g, b);
  return (sat >= 0.32 && lum >= 75) || chroma >= 68;
}

function canGrow(r, g, b) {
  if (isBackground(r, g, b)) return false;
  const { chroma, sat, lum } = metrics(r, g, b);
  return (sat >= 0.14 && lum >= 38) || chroma >= 34 || lum >= 72;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

function morphErode(mask, w, h) {
  const snap = Uint8Array.from(mask);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (!snap[idx]) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (!snap[(y + dy) * w + (x + dx)]) {
          mask[idx] = 0;
          break;
        }
      }
    }
  }
}

function morphDilate(mask, w, h) {
  const snap = Uint8Array.from(mask);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (snap[idx]) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (snap[(y + dy) * w + (x + dx)]) {
          mask[idx] = 1;
          break;
        }
      }
    }
  }
}

function morphOpen(mask, w, h, passes = 2) {
  for (let p = 0; p < passes; p++) {
    const snap = Uint8Array.from(mask);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (!snap[idx]) continue;
        let neighbors = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          if (snap[(y + dy) * w + (x + dx)]) neighbors++;
        }
        if (neighbors < 2) mask[idx] = 0;
      }
    }
  }
}

if (!fs.existsSync(source)) {
  console.error(`Source not found: ${source}`);
  process.exit(1);
}

// Preserve HD master in assets if using Downloads fallback
if (source === fallbackSource && !fs.existsSync(defaultSource)) {
  fs.copyFileSync(source, defaultSource);
  console.log(`Saved master copy → ${defaultSource}`);
}

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const src = Buffer.from(data);
const n = w * h;

// Auto-crop to saturated letterforms (excludes footer metadata on HD export)
let minX = w;
let maxX = 0;
let minY = h;
let maxY = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!isCore(src[i], src[i + 1], src[i + 2])) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
}

const cropPadX = 24;
const cropPadY = 20;
minX = Math.max(0, minX - cropPadX);
minY = Math.max(0, minY - cropPadY);
maxX = Math.min(w - 1, maxX + cropPadX);
maxY = Math.min(h - 1, maxY + cropPadY);
const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;

const croppedSrc = Buffer.alloc(cropW * cropH * 4);
for (let y = 0; y < cropH; y++) {
  for (let x = 0; x < cropW; x++) {
    const si = ((minY + y) * w + (minX + x)) * 4;
    const di = (y * cropW + x) * 4;
    croppedSrc[di] = src[si];
    croppedSrc[di + 1] = src[si + 1];
    croppedSrc[di + 2] = src[si + 2];
    croppedSrc[di + 3] = src[si + 3];
  }
}

const cw = cropW;
const ch = cropH;
const cn = cw * ch;
const fg = new Uint8Array(cn);
const q = [];

for (let idx = 0; idx < cn; idx++) {
  const i = idx * 4;
  if (isCore(croppedSrc[i], croppedSrc[i + 1], croppedSrc[i + 2])) {
    fg[idx] = 1;
    q.push(idx);
  }
}

while (q.length) {
  const idx = q.shift();
  const x = idx % cw;
  const y = (idx / cw) | 0;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
    const nidx = ny * cw + nx;
    if (fg[nidx]) continue;
    const i = nidx * 4;
    if (!canGrow(croppedSrc[i], croppedSrc[i + 1], croppedSrc[i + 2])) continue;
    fg[nidx] = 1;
    q.push(nidx);
  }
}

// Drop desaturated fringe touching transparency
for (let y = 1; y < ch - 1; y++) {
  for (let x = 1; x < cw - 1; x++) {
    const idx = y * cw + x;
    if (!fg[idx]) continue;
    const m = metrics(croppedSrc[idx * 4], croppedSrc[idx * 4 + 1], croppedSrc[idx * 4 + 2]);
    if (m.sat >= 0.22 && m.lum >= 42) continue;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (!fg[(y + dy) * cw + (x + dx)]) {
        fg[idx] = 0;
        break;
      }
    }
  }
}

morphOpen(fg, cw, ch, 2);
morphDilate(fg, cw, ch);
morphErode(fg, cw, ch);

// Remove tiny islands
const visited = new Uint8Array(cn);
for (let idx = 0; idx < cn; idx++) {
  if (!fg[idx] || visited[idx]) continue;
  const stack = [idx];
  const comp = [];
  let hasCore = false;
  visited[idx] = 1;
  while (stack.length) {
    const cur = stack.pop();
    comp.push(cur);
    const i = cur * 4;
    if (isCore(croppedSrc[i], croppedSrc[i + 1], croppedSrc[i + 2])) hasCore = true;
    const x = cur % cw;
    const y = (cur / cw) | 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
      const nidx = ny * cw + nx;
      if (!fg[nidx] || visited[nidx]) continue;
      visited[nidx] = 1;
      stack.push(nidx);
    }
  }
  if (!hasCore || comp.length < 24) {
    for (const c of comp) fg[c] = 0;
  }
}

// Shave outer fringe, restore body
morphErode(fg, cw, ch);
morphDilate(fg, cw, ch);

// Content bounds for horizontal gradient mapping
let gradMinX = cw;
let gradMaxX = 0;
for (let x = 0; x < cw; x++) {
  for (let y = 0; y < ch; y++) {
    if (!fg[y * cw + x]) continue;
    gradMinX = Math.min(gradMinX, x);
    gradMaxX = Math.max(gradMaxX, x);
    break;
  }
}

// Brand gradient anchors (purple → blue → teal)
const gradientStops = [
  { pos: 0, color: [118, 92, 220] },
  { pos: 0.38, color: [72, 138, 222] },
  { pos: 0.58, color: [38, 188, 196] },
  { pos: 1, color: [24, 208, 182] },
];

function gradientAt(t) {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < gradientStops.length - 1; i++) {
    const a = gradientStops[i];
    const b = gradientStops[i + 1];
    if (clamped <= b.pos) {
      const local = (clamped - a.pos) / (b.pos - a.pos);
      return lerpColor(a.color, b.color, local);
    }
  }
  return gradientStops[gradientStops.length - 1].color;
}

// Flat gradient fill — solid purple→teal, no scanline texture
const out = Buffer.alloc(cn * 4);
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const idx = y * cw + x;
    const i = idx * 4;
    if (!fg[idx]) {
      out[i + 3] = 0;
      continue;
    }
    const t = gradMaxX > gradMinX ? (x - gradMinX) / (gradMaxX - gradMinX) : 0;
    const [r, g, b] = gradientAt(t);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = 255;
  }
}

// Scale to app-friendly width (~1400px) while keeping sharp alpha
const targetWidth = 1400;
const scale = targetWidth / cw;
const targetHeight = Math.round(ch * scale);

// Premultiply before resize so transparent areas don't bleed black into edges
const premul = Buffer.alloc(cn * 4);
for (let idx = 0; idx < cn; idx++) {
  const i = idx * 4;
  const a = out[i + 3] / 255;
  premul[i] = Math.round(out[i] * a);
  premul[i + 1] = Math.round(out[i + 1] * a);
  premul[i + 2] = Math.round(out[i + 2] * a);
  premul[i + 3] = out[i + 3];
}

const { data: scaled, info: scaledInfo } = await sharp(premul, { raw: { width: cw, height: ch, channels: 4 } })
  .resize(targetWidth, targetHeight, { kernel: sharp.kernel.lanczos3 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const sw = scaledInfo.width;
const sh = scaledInfo.height;
const finalBuf = Buffer.alloc(sw * sh * 4);

for (let idx = 0; idx < sw * sh; idx++) {
  const i = idx * 4;
  const a = scaled[i + 3] >= 128 ? 255 : 0;
  if (!a) {
    finalBuf[i + 3] = 0;
    continue;
  }
  const alpha = scaled[i + 3] / 255;
  finalBuf[i] = alpha > 0 ? Math.min(255, Math.round(scaled[i] / alpha)) : 0;
  finalBuf[i + 1] = alpha > 0 ? Math.min(255, Math.round(scaled[i + 1] / alpha)) : 0;
  finalBuf[i + 2] = alpha > 0 ? Math.min(255, Math.round(scaled[i + 2] / alpha)) : 0;
  finalBuf[i + 3] = 255;
}

// Drop only clearly-background edge pixels after scale
for (let y = 1; y < sh - 1; y++) {
  for (let x = 1; x < sw - 1; x++) {
    const idx = y * sw + x;
    const i = idx * 4;
    if (!finalBuf[i + 3]) continue;
    const m = metrics(finalBuf[i], finalBuf[i + 1], finalBuf[i + 2]);
    let border = false;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (!finalBuf[((y + dy) * sw + (x + dx)) * 4 + 3]) border = true;
    }
    if (border && m.sat < 0.18 && m.lum < 42) finalBuf[i + 3] = 0;
  }
}

await sharp(finalBuf, { raw: { width: sw, height: sh, channels: 4 } })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(output);

const finalMeta = { width: sw, height: sh };
let kept = 0;
let lowSat = 0;
let semi = 0;
const { data: finalData } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const fn = sw * sh;
for (let idx = 0; idx < fn; idx++) {
  const i = idx * 4;
  const a = finalData[i + 3];
  if (!a) continue;
  kept++;
  if (a < 255) semi++;
  const m = metrics(finalData[i], finalData[i + 1], finalData[i + 2]);
  if (m.sat < 0.22) lowSat++;
}

console.log(`Source: ${source}`);
console.log(`Output: ${output}`);
console.log({
  crop: `${cw}x${ch}`,
  size: `${finalMeta.width}x${finalMeta.height}`,
  kept,
  semi,
  lowSat,
  transparentPct: `${(((fn - kept) / fn) * 100).toFixed(1)}%`,
});
