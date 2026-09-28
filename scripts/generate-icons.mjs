// Génère les icônes PWA et les écrans de démarrage iOS en PNG, sans dépendance (zlib natif).
// Même géométrie que src/design/components/Logo.tsx (repère 64×64).
// Usage : npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const FOREST = [31, 61, 43];
const PAPER = [245, 241, 234];
const GOLD = [201, 168, 98];

// « E » : trois segments, trait de 5 unités.
const E_SEGMENTS = [
  [20, 16, 44, 16],
  [20, 48, 44, 48],
  [20, 16, 20, 48],
];
const E_RADIUS = 2.5;

// Courbe dorée : M20 32 C26 26.5 32 26.5 37 32 S45.5 37 48 31 → échantillonnée en segments.
function cubic(p0, p1, p2, p3, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}
const curve = [...cubic([20, 32], [26, 26.5], [32, 26.5], [37, 32], 24), ...cubic([37, 32], [42, 37.5], [45.5, 37], [48, 31], 24).slice(1)];
const CURVE_SEGMENTS = curve.slice(1).map((p, i) => [...curve[i], ...p]);
const CURVE_RADIUS = 2.25;

// Centre visuel du monogramme dans le repère 64 et taille de la boîte englobante.
const CX = 34;
const CY = 32;
const EXTENT = 36;

function distToSegment(x, y, [x1, y1, x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

const near = (x, y, segs, r) => segs.some((s) => distToSegment(x, y, s) <= r);

function crc32(buf) {
  const table = (crc32.t ??= Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      const [r, g, b] = pixel(x, y);
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Fond vert forêt plein cadre + monogramme centré, dont la boîte fait `mark` px. Suréchantillonnage 4×4. */
function render(w, h, mark) {
  const scale = mark / EXTENT; // px par unité du repère 64
  const S = [0.125, 0.375, 0.625, 0.875];
  const half = (EXTENT / 2 + 3) * scale;
  return png(w, h, (x, y) => {
    if (Math.abs(x - w / 2) > half || Math.abs(y - h / 2) > half) return FOREST;
    let e = 0;
    let g = 0;
    for (const sx of S)
      for (const sy of S) {
        const u = CX + (x + sx - w / 2) / scale;
        const v = CY + (y + sy - h / 2) / scale;
        if (near(u, v, CURVE_SEGMENTS, CURVE_RADIUS)) g++;
        else if (near(u, v, E_SEGMENTS, E_RADIUS)) e++;
      }
    const a = e / 16;
    const b = g / 16;
    return [0, 1, 2].map((i) => Math.round(FOREST[i] * (1 - a - b) + PAPER[i] * a + GOLD[i] * b));
  });
}

const icons = [
  ['icon-192.png', 192, 110],
  ['icon-512.png', 512, 290],
  ['icon-maskable-512.png', 512, 240], // zone sûre des icônes masquables (cercle de 80 %)
  ['apple-touch-icon.png', 180, 104],
  ['favicon-32.png', 32, 24],
];
for (const [name, size, mark] of icons) {
  writeFileSync(join(OUT, name), render(size, size, mark));
  console.log('✓', name);
}

// Écrans de démarrage iOS (portrait).
const splashes = [
  [750, 1334],
  [828, 1792],
  [1125, 2436],
  [1170, 2532],
  [1179, 2556],
  [1242, 2688],
  [1284, 2778],
  [1290, 2796],
];
for (const [w, h] of splashes) {
  writeFileSync(join(OUT, `splash-${w}x${h}.png`), render(w, h, Math.round(w * 0.3)));
  console.log('✓', `splash-${w}x${h}.png`);
}
