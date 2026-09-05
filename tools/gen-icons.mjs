/**
 * Procedural app-icon generator for QR Code Forge.
 *
 * Zero-dependency: draws the icon mathematically, then writes real PNG files
 * using a small hand-rolled PNG encoder (zlib is built into Node).
 *
 *   node tools/gen-icons.mjs
 *
 * Outputs:
 *   build/icon.png                 (512x512 — electron-builder base icon)
 *   build/icons/{n}x{n}.png        (16…512 — Linux/desktop icon set)
 *   flatpak/icons/{n}x{n}.png      (128/256/512 — Flatpak hicolor icons)
 */
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

/* ---------------- tiny PNG encoder ---------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* ---------------- drawing ---------------- */

const lerp = (a, b, t) => a + (b - a) * t
const lerp3 = (c1, c2, t) => [
  Math.round(lerp(c1[0], c2[0], t)),
  Math.round(lerp(c1[1], c2[1], t)),
  Math.round(lerp(c1[2], c2[2], t))
]

const BG1 = [109, 40, 217] // #6d28d9
const BG2 = [8, 145, 178] // #0891b2
const WHITE = [255, 255, 255]
const clamp01 = (v) => Math.max(0, Math.min(1, v))

/** signed distance to rounded rect centred (cx,cy), half-extents hx,hy, radius r (unit coords) */
function sdRoundRect(px, py, cx, cy, hx, hy, r) {
  const qx = Math.abs(px - cx) - (hx - r)
  const qy = Math.abs(py - cy) - (hy - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r
}

const MODULES = 21
const CELL0 = 0.165 // content box start (unit coords)
const CELL1 = 0.835
const CELL = (CELL1 - CELL0) / MODULES

const inFinder = (c, r) => (r < 7 && c < 7) || (r < 7 && c >= 14) || (r >= 14 && c < 7)
const inCenter = (r, c) => r >= 8 && r <= 12 && c >= 8 && c <= 12

// deterministic pseudo-random modules (fills the pattern area)
function moduleOn(r, c) {
  let h = (r * 73856093) ^ (c * 19349663)
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) % 100 < 46
}

/** finder ring: 3 = outer white ring, <=1 = inner white core, 2 = gap (gradient) */
function finderRing(r, c) {
  const [a, b] = r < 7 && c < 7 ? [0, 0] : r < 7 ? [14, 0] : [0, 14]
  const fr = Math.abs(r - b - 3)
  const fc = Math.abs(c - a - 3)
  return Math.max(fr, fc)
}

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4)
  const m = CELL / size // module size in pixel units
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px0 = x / size
      const py0 = y / size
      const px1 = (x + 1) / size
      const py1 = (y + 1) / size
      const cxm = (px0 + px1) / 2
      const cym = (py0 + py1) / 2

      // rounded-rect background, gradient fill, anti-aliased edge
      const sd = sdRoundRect(cxm, cym, 0.5, 0.5, 0.47, 0.47, 0.155)
      const bgAlpha = clamp01(0.5 - sd * size)
      if (bgAlpha < 0.004) continue
      const bgCol = lerp3(BG1, BG2, clamp01((cxm + cym) / 2))
      let col = bgCol
      let white = 0 // coverage of white artwork over this pixel (0..1)

      const c = Math.floor((cxm - CELL0) / CELL)
      const r = Math.floor((cym - CELL0) / CELL)
      const inside = cxm >= CELL0 && cym >= CELL0 && cxm <= CELL1 && cym <= CELL1

      if (inside && c >= 0 && c < MODULES && r >= 0 && r < MODULES) {
        if (inFinder(c, r)) {
          const ring = finderRing(c, r)
          if (ring === 3 || ring <= 1) white = 1
        } else if (inCenter(r, c)) {
          // rounded center tile — soft edge via SDF coverage
          const tc = CELL0 + 10.5 * CELL
          const sdr = sdRoundRect(cxm, cym, tc, tc, 2.5 * CELL, 2.5 * CELL, CELL * 1.45)
          white = clamp01(0.5 - (sdr * size) * 0.55) // soften slightly
        } else if (moduleOn(r, c)) {
          // hard module rect — exact per-pixel area coverage
          const cov =
            Math.max(0, Math.min(px1, cxm + m / 2) - Math.max(px0, cxm - m / 2)) *
            Math.max(0, Math.min(py1, cym + m / 2) - Math.max(py0, cym - m / 2))
          white = clamp01(cov / (m * m))
        }
      }

      if (white > 0.004) col = lerp3(bgCol, WHITE, white)

      const i = (y * size + x) * 4
      buf[i] = col[0]
      buf[i + 1] = col[1]
      buf[i + 2] = col[2]
      buf[i + 3] = Math.round(bgAlpha * 255)
    }
  }
  return buf
}

/* ---------------- output ---------------- */

const OUT = [
  { file: 'build/icon.png', size: 512 },
  ...[16, 24, 32, 48, 64, 128, 256, 512].map((size) => ({ file: `build/icons/${size}x${size}.png`, size })),
  ...[128, 256, 512].map((size) => ({ file: `flatpak/icons/${size}x${size}.png`, size }))
]

for (const { file, size } of OUT) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const buf = renderIcon(size)
  fs.writeFileSync(file, encodePng(size, buf))
  console.log(`wrote ${file} (${size}x${size})`)
}
