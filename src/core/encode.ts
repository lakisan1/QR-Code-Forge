import QRCodeStyling from 'qr-code-styling'
import { AztecCodeWriter, DataMatrixWriter, BarcodeFormat, EncodeHintType } from '@zxing/library'
import type { BarcodeKind, StyleState } from '../types'
import type { Options } from 'qr-code-styling'
import { EC_SIZE_FACTOR } from './store'
import { matrixFromBits, drawMatrixToCanvas, matrixToSVG, type ModuleMatrix } from './render2d'

/* ---------- module-matrix encoders (Aztec / Data Matrix) ---------- */

type BitsLike = { getWidth(): number; getHeight(): number; get(x: number, y: number): boolean }
// the bundled .d.ts omits the hints parameter even though the JS accepts it
type WriterWithHints = {
  encode(c: string, f: unknown, w: number, h: number, hints?: Map<unknown, unknown>): BitsLike
}

export function encodeMatrix(text: string, kind: Exclude<BarcodeKind, 'qr'>): ModuleMatrix {
  if (kind === 'aztec') {
    const hints = new Map<EncodeHintType, string>([[EncodeHintType.CHARACTER_SET, 'UTF-8']])
    const bits = (new AztecCodeWriter() as unknown as WriterWithHints).encode(
      text,
      BarcodeFormat.AZTEC,
      1,
      1,
      hints
    )
    return matrixFromBits(bits)
  }
  const hints = new Map<EncodeHintType, string>([
    [EncodeHintType.MARGIN, '0'],
    [EncodeHintType.CHARACTER_SET, 'UTF-8']
  ])
  const bits = (new DataMatrixWriter() as unknown as WriterWithHints).encode(
    text,
    BarcodeFormat.DATA_MATRIX,
    1,
    1,
    hints
  )
  return matrixFromBits(bits)
}

/* ---------- QR via qr-code-styling ---------- */

export function qrOptions(style: StyleState, sizePx: number, data: string): Options {
  const grad = typeof style.fg === 'object' ? style.fg : undefined
  const solid = typeof style.fg === 'string' ? style.fg : undefined
  const fgColor = solid ?? grad?.colorStops[0]?.color
  const hasArt = style.logo.kind !== 'none' && !!style.logo.dataUrl
  // divide by the EC factor so the on-screen fraction matches what the user set
  const imageFraction = hasArt
    ? Math.min(Math.max(style.logo.size / EC_SIZE_FACTOR[style.ecLevel], 0.05), 0.45)
    : undefined
  return {
    width: sizePx,
    height: sizePx,
    type: 'canvas',
    shape: 'square',
    data,
    margin: style.margin,
    qrOptions: { errorCorrectionLevel: hasArt ? 'H' : style.ecLevel },
    image: hasArt ? (style.logo.dataUrl ?? undefined) : undefined,
    imageOptions: {
      hideBackgroundDots: style.logo.hideBackgroundDots,
      imageSize: imageFraction,
      margin: (style.logo.margin * sizePx) / 100,
      saveAsBlob: false,
      crossOrigin: undefined
    },
    dotsOptions: {
      type: style.dotShape,
      color: solid ?? fgColor,
      gradient: grad
    },
    cornersSquareOptions: {
      type: style.cornerSquareShape,
      color: solid ?? fgColor,
      gradient: grad
    },
    cornersDotOptions: {
      type: style.cornerDotShape,
      color: solid ?? fgColor,
      gradient: grad
    },
    backgroundOptions: {
      color: style.bgTransparent ? 'rgba(0,0,0,0)' : style.bg
    }
  }
}

/**
 * Owns the preview surfaces: a QRCodeStyling instance for QR codes and a
 * dedicated canvas for Aztec / Data Matrix.
 */
export class QRPreview {
  private qr: QRCodeStyling | null = null
  private qrHost: HTMLElement
  private matrixCanvas: HTMLCanvasElement

  constructor(qrHost: HTMLElement, matrixCanvas: HTMLCanvasElement) {
    this.qrHost = qrHost
    this.matrixCanvas = matrixCanvas
  }

  /** Renders `data`; returns matrix dimensions when known (for the status line). */
  async update(
    kind: BarcodeKind,
    data: string,
    style: StyleState,
    sizePx: number
  ): Promise<{ cols: number; rows: number } | null> {
    if (kind === 'qr') {
      this.qrHost.style.display = ''
      this.matrixCanvas.style.display = 'none'
      const opts = qrOptions(style, sizePx, data)
      if (!this.qr) this.qr = new QRCodeStyling(opts)
      this.qr.update(opts)
      if (!this.qrHost.firstChild) this.qr.append(this.qrHost)
      const count = (this.qr as unknown as { _qr?: { getModuleCount(): number } })._qr?.getModuleCount()
      return count ? { cols: count, rows: count } : null
    }
    this.qrHost.style.display = 'none'
    this.matrixCanvas.style.display = ''
    const m = encodeMatrix(data, kind)
    await drawMatrixToCanvas(this.matrixCanvas, m, style, sizePx)
    return { cols: m.cols, rows: m.rows }
  }
}

/* ---------- export rendering ---------- */

export type ExportFormat = 'png' | 'jpeg' | 'svg'

export async function renderExport(
  kind: BarcodeKind,
  data: string,
  style: StyleState,
  sizePx: number,
  format: ExportFormat,
  quality = 0.92
): Promise<Blob> {
  if (kind === 'qr') {
    const qr = new QRCodeStyling(qrOptions(style, sizePx, data))
    if (format === 'svg') {
      const raw = await qr.getRawData('svg')
      if (raw instanceof Blob) return raw
      if (typeof raw === 'string') return new Blob([raw], { type: 'image/svg+xml' })
      throw new Error('svg export failed')
    }
    const raw = await qr.getRawData('png')
    if (!(raw instanceof Blob)) throw new Error('png export failed')
    if (format === 'png') return raw
    // JPEG with quality control: rasterize the PNG through a canvas
    const bmp = await createImageBitmap(raw)
    const canvas = document.createElement('canvas')
    canvas.width = sizePx
    canvas.height = sizePx
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.fillStyle = style.bgTransparent ? '#ffffff' : style.bg
    ctx.fillRect(0, 0, sizePx, sizePx)
    ctx.drawImage(bmp, 0, 0, sizePx, sizePx)
    bmp.close()
    return await canvasToBlob(canvas, 'image/jpeg', quality)
  }

  // Aztec / Data Matrix
  const m = encodeMatrix(data, kind)
  if (format === 'svg') {
    const svg = matrixToSVG(m, style, sizePx, style.logo.dataUrl)
    return new Blob([svg], { type: 'image/svg+xml' })
  }
  const canvas = document.createElement('canvas')
  await drawMatrixToCanvas(canvas, m, style, sizePx)
  if (format === 'png') return await canvasToBlob(canvas, 'image/png')
  if (!style.bgTransparent) {
    // already painted background inside drawMatrixToCanvas
  }
  return await canvasToBlob(canvas, 'image/jpeg', quality)
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))),
      mime,
      quality
    )
  })
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}
