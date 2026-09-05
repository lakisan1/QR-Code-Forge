export type ContentType = 'text' | 'wifi' | 'vcard' | 'email' | 'sms' | 'tel' | 'geo' | 'whatsapp'

export type FieldType = 'text' | 'textarea' | 'password' | 'number' | 'select' | 'checkbox'

export interface FieldOption {
  value: string
  labelKey: string
}

export interface FieldDef {
  key: string
  type: FieldType
  required?: boolean
  placeholderKey?: string
  options?: FieldOption[]
  half?: boolean
}

export interface TypeDef {
  type: ContentType
  icon: string
  fields: FieldDef[]
}

export type BarcodeKind = 'qr' | 'aztec' | 'datamatrix'

export interface Gradient {
  type: 'linear' | 'radial'
  rotation: number // degrees
  colorStops: { offset: number; color: string }[]
}

export type ColorSpec = string | Gradient

export type DotShape =
  | 'square'
  | 'dots'
  | 'rounded'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded'

export type LogoKind = 'none' | 'image' | 'emoji'

export interface LogoState {
  kind: LogoKind
  dataUrl: string | null // uploaded image or rasterized emoji, as data URL
  emoji: string | null // chosen emoji (source of truth when kind === 'emoji')
  size: number // fraction of QR width, 0.10 – 0.35
  margin: number // gap around the art, fraction units (0 – 0.06)
  hideBackgroundDots: boolean
  backing: boolean // white rounded backing tile behind emoji
}

export interface StyleState {
  dotShape: DotShape
  cornerSquareShape: 'square' | 'dots' | 'extra-rounded'
  cornerDotShape: 'square' | 'dot'
  fg: ColorSpec
  bg: string
  bgTransparent: boolean
  margin: number // quiet zone in modules
  ecLevel: 'L' | 'M' | 'Q' | 'H'
  logo: LogoState
}

export interface HistoryEntry {
  id: string
  ts: number
  type: ContentType
  barcode: BarcodeKind
  title: string
  subtitle: string
  content: Record<string, string | boolean>
  style: StyleState
}
