import type { ColorSpec, DotShape, StyleState } from '../types'
import { EC_SIZE_FACTOR } from './store'

export interface ModuleMatrix {
  cols: number
  rows: number
  get(x: number, y: number): boolean
}

export function matrixFromBits(
  bits: { getWidth(): number; getHeight(): number; get(x: number, y: number): boolean }
): ModuleMatrix {
  return {
    cols: bits.getWidth(),
    rows: bits.getHeight(),
    get(x: number, y: number): boolean {
      return bits.get(x, y)
    }
  }
}

/* ---------- color helpers ---------- */

function isGradient(c: ColorSpec): c is Exclude<ColorSpec, string> {
  return typeof c === 'object' && c !== null
}

function makeGradient(
  ctx: CanvasRenderingContext2D,
  g: Exclude<ColorSpec, string>,
  sizePx: number
): CanvasGradient {
  const rad = ((g.rotation ?? 0) * Math.PI) / 180
  const cx = sizePx / 2
  const cy = sizePx / 2
  const r = sizePx * 0.75
  const grad =
    g.type === 'radial'
      ? ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      : ctx.createLinearGradient(
          cx - Math.cos(rad) * (sizePx / 2),
          cy - Math.sin(rad) * (sizePx / 2),
          cx + Math.cos(rad) * (sizePx / 2),
          cy + Math.sin(rad) * (sizePx / 2)
        )
  for (const stop of g.colorStops) grad.addColorStop(stop.offset, stop.color)
  return grad
}

function paintFor(ctx: CanvasRenderingContext2D, c: ColorSpec, sizePx: number): string | CanvasGradient {
  return isGradient(c) ? makeGradient(ctx, c, sizePx) : c
}

function gradientDef(g: Exclude<ColorSpec, string>, id: string, sizePx: number): string {
  const rad = ((g.rotation ?? 0) * Math.PI) / 180
  const cx = sizePx / 2
  const cy = sizePx / 2
  const r = sizePx * 0.75
  const stops = g.colorStops.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('')
  if (g.type === 'radial') {
    return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">${stops}</radialGradient>`
  }
  return `<linearGradient id="${id}" x1="${cx - Math.cos(rad) * (sizePx / 2)}" y1="${cy - Math.sin(rad) * (sizePx / 2)}" x2="${cx + Math.cos(rad) * (sizePx / 2)}" y2="${cy + Math.sin(rad) * (sizePx / 2)}" gradientUnits="userSpaceOnUse">${stops}</linearGradient>`
}

/* ---------- module shapes ---------- */

function modulePath(
  shape: DotShape,
  x: number,
  y: number,
  s: number,
  up: boolean,
  down: boolean,
  left: boolean,
  right: boolean
): { type: 'rect'; x: number; y: number; w: number; h: number; rx?: number | number[] } | { type: 'circle'; cx: number; cy: number; r: number } {
  const cx = x + s / 2
  const cy = y + s / 2
  switch (shape) {
    case 'dots':
      return { type: 'circle', cx, cy, r: s * 0.5 }
    case 'extra-rounded':
      return { type: 'rect', x, y, w: s, h: s, rx: s * 0.5 }
    case 'rounded':
      return { type: 'rect', x, y, w: s, h: s, rx: s * 0.35 }
    case 'classy':
    case 'classy-rounded': {
      // neighbor-aware rounding: a corner rounds only when the module has no
      // neighbor on both adjacent edges — fuses like the real "classy" figure
      const r = shape === 'classy' ? s * 0.5 : s * 0.5
      const tl = !up && !left ? r : 0
      const tr = !up && !right ? r : 0
      const br = !down && !right ? r : 0
      const bl = !down && !left ? r : 0
      return { type: 'rect', x, y, w: s, h: s, rx: [tl, tr, br, bl] }
    }
    default:
      return { type: 'rect', x, y, w: s, h: s }
  }
}

/* ---------- image cache ---------- */

const imageCache = new Map<string, HTMLImageElement>()

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(dataUrl)
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(dataUrl, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error('failed to load image'))
    img.src = dataUrl
  })
}

/* ---------- canvas renderer (Aztec / Data Matrix) ---------- */

export async function drawMatrixToCanvas(
  canvas: HTMLCanvasElement,
  m: ModuleMatrix,
  style: StyleState,
  sizePx: number
): Promise<void> {
  canvas.width = sizePx
  canvas.height = sizePx
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.clearRect(0, 0, sizePx, sizePx)

  const total = Math.max(m.cols, m.rows) + style.margin * 2
  const scale = sizePx / total
  const ox = ((total - m.cols) / 2) * scale
  const oy = ((total - m.rows) / 2) * scale

  if (!style.bgTransparent) {
    ctx.fillStyle = style.bg
    ctx.fillRect(0, 0, sizePx, sizePx)
  }

  // center-art box (for hideBackgroundDots + compositing)
  const logo = style.logo
  const hasArt = logo.kind !== 'none' && !!logo.dataUrl
  let artBox: { x: number; y: number; s: number } | null = null
  if (hasArt) {
    const frac = Math.min(logo.size * EC_SIZE_FACTOR[style.ecLevel], 0.5)
    artBox = {
      x: (sizePx - sizePx * frac) / 2,
      y: (sizePx - sizePx * frac) / 2,
      s: sizePx * frac
    }
  }

  const paint = paintFor(ctx, style.fg, sizePx)
  ctx.fillStyle = paint
  const inArt = (px: number, py: number, w = 1, h = 1): boolean =>
    !!artBox &&
    logo.hideBackgroundDots &&
    px + w > (artBox.x - ox) / scale &&
    px < (artBox.x + artBox.s - ox) / scale &&
    py + h > (artBox.y - oy) / scale &&
    py < (artBox.y + artBox.s - oy) / scale

  for (let y = 0; y < m.rows; y++) {
    for (let x = 0; x < m.cols; x++) {
      if (!m.get(x, y)) continue
      if (inArt(x, y)) continue
      const px = ox + x * scale
      const py = oy + y * scale
      const fig = modulePath(
        style.dotShape,
        px,
        py,
        scale * 1.02,
        y === 0 || m.get(x, y - 1),
        y === m.rows - 1 || m.get(x, y + 1),
        x === 0 || m.get(x - 1, y),
        x === m.cols - 1 || m.get(x + 1, y)
      )
      if (fig.type === 'circle') {
        ctx.beginPath()
        ctx.arc(fig.cx, fig.cy, fig.r, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.roundRect(fig.x, fig.y, fig.w, fig.h, fig.rx ?? 0)
        ctx.fill()
      }
    }
  }

  if (hasArt && artBox && logo.dataUrl) {
    if (logo.backing) {
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      const pad = artBox.s * 0.06
      ctx.roundRect(artBox.x - pad, artBox.y - pad, artBox.s + pad * 2, artBox.s + pad * 2, artBox.s * 0.22)
      ctx.fill()
      ctx.restore()
    }
    const img = await loadImage(logo.dataUrl)
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height
    const k = Math.min(artBox.s / iw, artBox.s / ih)
    const w = iw * k
    const h = ih * k
    ctx.drawImage(img, artBox.x + (artBox.s - w) / 2, artBox.y + (artBox.s - h) / 2, w, h)
  }
}

/* ---------- SVG serializer (Aztec / Data Matrix) ---------- */

export function matrixToSVG(m: ModuleMatrix, style: StyleState, sizePx: number, imageDataUrl?: string | null): string {
  const total = Math.max(m.cols, m.rows) + style.margin * 2
  const scale = sizePx / total
  const ox = ((total - m.cols) / 2) * scale
  const oy = ((total - m.rows) / 2) * scale
  const defs: string[] = []
  let fillFg: string
  if (isGradient(style.fg)) {
    defs.push(gradientDef(style.fg, 'fgGrad', sizePx))
    fillFg = 'url(#fgGrad)'
  } else {
    fillFg = style.fg
  }

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}">`
  )
  if (defs.length) parts.push(`<defs>${defs.join('')}</defs>`)
  if (!style.bgTransparent) parts.push(`<rect width="${sizePx}" height="${sizePx}" fill="${style.bg}"/>`)

  const hasArt = style.logo.kind !== 'none' && !!style.logo.dataUrl
  let artBox: { x: number; y: number; s: number } | null = null
  if (hasArt) {
    const frac = Math.min(style.logo.size * EC_SIZE_FACTOR[style.ecLevel], 0.5)
    artBox = { x: (sizePx - sizePx * frac) / 2, y: (sizePx - sizePx * frac) / 2, s: sizePx * frac }
  }
  const inArt = (px: number, py: number): boolean =>
    !!artBox && style.logo.hideBackgroundDots && px + scale > artBox.x && px < artBox.x + artBox.s && py + scale > artBox.y && py < artBox.y + artBox.s

  for (let y = 0; y < m.rows; y++) {
    for (let x = 0; x < m.cols; x++) {
      if (!m.get(x, y) || inArt(ox + x * scale, oy + y * scale)) continue
      const fig = modulePath(
        style.dotShape,
        ox + x * scale,
        oy + y * scale,
        scale * 1.02,
        y === 0 || m.get(x, y - 1),
        y === m.rows - 1 || m.get(x, y + 1),
        x === 0 || m.get(x - 1, y),
        x === m.cols - 1 || m.get(x + 1, y)
      )
      if (fig.type === 'circle') {
        parts.push(`<circle cx="${fig.cx.toFixed(2)}" cy="${fig.cy.toFixed(2)}" r="${fig.r.toFixed(2)}" fill="${fillFg}"/>`)
      } else {
        const rx = Array.isArray(fig.rx)
          ? `rx="${fig.rx.map((v) => v.toFixed(2)).join(' ')}"` // per-corner radii use the path form below
          : fig.rx
            ? `rx="${fig.rx.toFixed(2)}"`
            : ''
        if (Array.isArray(fig.rx)) {
          const [tl, tr, br, bl] = fig.rx
          const p = `M${fig.x + tl},${fig.y} L${fig.x + fig.w - tr},${fig.y} Q${fig.x + fig.w},${fig.y} ${fig.x + fig.w},${fig.y + tr} L${fig.x + fig.w},${fig.y + fig.h - br} Q${fig.x + fig.w},${fig.y + fig.h} ${fig.x + fig.w - br},${fig.y + fig.h} L${fig.x + bl},${fig.y + fig.h} Q${fig.x},${fig.y + fig.h} ${fig.x},${fig.y + fig.h - bl} L${fig.x},${fig.y + tl} Q${fig.x},${fig.y} ${fig.x + tl},${fig.y} Z`
          parts.push(`<path d="${p}" fill="${fillFg}"/>`)
        } else {
          parts.push(`<rect x="${fig.x.toFixed(2)}" y="${fig.y.toFixed(2)}" width="${fig.w.toFixed(2)}" height="${fig.h.toFixed(2)}" ${rx} fill="${fillFg}"/>`)
        }
      }
    }
  }

  if (hasArt && artBox && style.logo.dataUrl && imageDataUrl) {
    if (style.logo.backing) {
      const pad = artBox.s * 0.06
      parts.push(
        `<rect x="${(artBox.x - pad).toFixed(2)}" y="${(artBox.y - pad).toFixed(2)}" width="${(artBox.s + pad * 2).toFixed(2)}" height="${(artBox.s + pad * 2).toFixed(2)}" rx="${(artBox.s * 0.22).toFixed(2)}" fill="#ffffff"/>`
      )
    }
    parts.push(
      `<image href="${imageDataUrl}" x="${artBox.x.toFixed(2)}" y="${artBox.y.toFixed(2)}" width="${artBox.s.toFixed(2)}" height="${artBox.s.toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`
    )
  }
  parts.push('</svg>')
  return parts.join('')
}
