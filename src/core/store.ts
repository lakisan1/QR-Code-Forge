import type { BarcodeKind, ContentType, HistoryEntry, LogoState, StyleState } from '../types'
import { CONTENT_TYPES } from './payload'

const LS_STYLE = 'forge.style.v1'
const LS_VALUES = 'forge.values.v1'
const LS_HISTORY = 'forge.history.v1'
const LS_UI = 'forge.ui.v1'

export const EC_SIZE_FACTOR: Record<StyleState['ecLevel'], number> = {
  L: 1.0,
  M: 1.11,
  Q: 1.25,
  H: 1.41
}

export const DEFAULT_STYLE: StyleState = {
  dotShape: 'classy',
  cornerSquareShape: 'extra-rounded',
  cornerDotShape: 'dot',
  fg: {
    type: 'linear',
    rotation: 45,
    colorStops: [
      { offset: 0, color: '#6d28d9' },
      { offset: 1, color: '#0891b2' }
    ]
  },
  bg: '#ffffff',
  bgTransparent: false,
  margin: 2,
  ecLevel: 'Q',
  logo: {
    kind: 'none',
    dataUrl: null,
    emoji: null,
    size: 0.22,
    margin: 1.2,
    hideBackgroundDots: true,
    backing: true
  }
}

function defaultValues(): Record<ContentType, Record<string, string | boolean>> {
  const out = {} as Record<ContentType, Record<string, string | boolean>>
  for (const def of CONTENT_TYPES) {
    const rec: Record<string, string | boolean> = {}
    for (const f of def.fields) {
      rec[f.key] =
        f.type === 'checkbox'
          ? false
          : f.type === 'select'
            ? (f.options?.[0]?.value ?? '')
            : ''
    }
    out[def.type] = rec
  }
  return out
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

/**
 * What changed. UI panels subscribe with a reason filter so e.g. typing in a
 * form input (reason 'form') never triggers a rebuild of the style panel or
 * the focused input itself.
 */
export type ChangeReason =
  | 'form' // content field value changed
  | 'style' // style / logo state changed
  | 'type' // active content type changed
  | 'barcode' // active barcode kind changed
  | 'restore' // a history entry was restored (everything may have changed)
  | 'theme'
  | 'history'
  | 'export'

type Listener = (reason: ChangeReason) => void

class Store {
  style: StyleState = structuredClone(DEFAULT_STYLE)
  values: Record<ContentType, Record<string, string | boolean>> = defaultValues()
  history: HistoryEntry[] = []
  activeType: ContentType = 'text'
  barcode: BarcodeKind = 'qr'
  theme: 'dark' | 'light' = 'dark'
  exportFormat: 'png' | 'jpeg' | 'svg' = 'png'
  exportSize = 1024
  exportQuality = 0.92

  private listeners = new Set<Listener>()

  constructor() {
    try {
      const rawStyle = localStorage.getItem(LS_STYLE)
      if (rawStyle) {
        const parsed = JSON.parse(rawStyle) as Partial<StyleState>
        this.style = { ...structuredClone(DEFAULT_STYLE), ...parsed }
        this.style.logo = { ...DEFAULT_STYLE.logo, ...(parsed.logo ?? {}) }
      }
      const rawValues = localStorage.getItem(LS_VALUES)
      if (rawValues) {
        this.values = { ...defaultValues(), ...(JSON.parse(rawValues) as typeof this.values) }
      }
      const rawHistory = localStorage.getItem(LS_HISTORY)
      if (rawHistory) {
        const h = JSON.parse(rawHistory) as HistoryEntry[]
        if (Array.isArray(h)) this.history = h.slice(0, 20)
      }
      const ui = load<Record<string, unknown>>(LS_UI, {}) ?? {}
      this.activeType = (ui.activeType as ContentType) ?? 'text'
      this.barcode = (ui.barcode as BarcodeKind) ?? 'qr'
      this.theme = (ui.theme as 'dark' | 'light') ?? 'dark'
      this.exportFormat = (ui.exportFormat as 'png' | 'jpeg' | 'svg') ?? 'png'
      this.exportSize = (ui.exportSize as number) ?? 1024
      this.exportQuality = (ui.exportQuality as number) ?? 0.92
    } catch {
      /* keep defaults */
    }
  }

  on(l: Listener): () => void {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  private emit(reason: ChangeReason): void {
    for (const l of this.listeners) l(reason)
  }

  updateStyle(patch: Partial<StyleState>): void {
    this.style = { ...this.style, ...patch }
    save(LS_STYLE, this.style)
    this.emit('style')
  }

  setLogo(patch: Partial<LogoState>): void {
    this.updateStyle({ logo: { ...this.style.logo, ...patch } })
  }

  setValue(type: ContentType, key: string, value: string | boolean): void {
    this.values = { ...this.values, [type]: { ...this.values[type], [key]: value } }
    save(LS_VALUES, this.values)
    this.emit('form')
  }

  setActiveType(type: ContentType): void {
    if (type === this.activeType) return
    this.activeType = type
    save(LS_UI, this.uiSnapshot())
    this.emit('type')
  }

  setBarcode(kind: BarcodeKind): void {
    if (kind === this.barcode) return
    this.barcode = kind
    save(LS_UI, this.uiSnapshot())
    this.emit('barcode')
  }

  setTheme(theme: 'dark' | 'light'): void {
    if (theme === this.theme) return
    this.theme = theme
    save(LS_UI, this.uiSnapshot())
    this.emit('theme')
  }

  setExport(patch: Partial<Pick<Store, 'exportFormat' | 'exportSize' | 'exportQuality'>>): void {
    Object.assign(this, patch)
    save(LS_UI, this.uiSnapshot())
    this.emit('export')
  }

  restoreEntry(entry: HistoryEntry): void {
    this.activeType = entry.type
    this.barcode = entry.barcode
    this.values = {
      ...this.values,
      [entry.type]: { ...(entry.content ?? {}) }
    }
    this.style = structuredClone(entry.style)
    this.style.logo = { ...DEFAULT_STYLE.logo, ...(entry.style.logo ?? {}) }
    save(LS_STYLE, this.style)
    save(LS_VALUES, this.values)
    save(LS_UI, this.uiSnapshot())
    this.emit('restore')
  }

  private uiSnapshot(): Record<string, unknown> {
    return {
      activeType: this.activeType,
      barcode: this.barcode,
      theme: this.theme,
      exportFormat: this.exportFormat,
      exportSize: this.exportSize,
      exportQuality: this.exportQuality
    }
  }

  addHistory(entry: HistoryEntry): void {
    this.history = [
      entry,
      ...this.history.filter(
        (h) => !(h.type === entry.type && h.subtitle === entry.subtitle && h.barcode === entry.barcode)
      )
    ].slice(0, 20)
    save(LS_HISTORY, this.history)
    this.emit('history')
  }

  removeHistory(id: string): void {
    this.history = this.history.filter((h) => h.id !== id)
    save(LS_HISTORY, this.history)
    this.emit('history')
  }

  clearHistory(): void {
    this.history = []
    save(LS_HISTORY, this.history)
    this.emit('history')
  }
}

export const store = new Store()
