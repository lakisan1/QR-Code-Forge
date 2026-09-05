import type { DotShape, LogoKind, StyleState } from '../types'
import { store } from '../core/store'
import { t } from '../i18n'
import { openEmojiPicker, rasterizeEmoji } from './emoji'

const DOT_SHAPES: DotShape[] = ['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded']

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (html !== undefined) node.innerHTML = html
  return node
}

function section(titleKey: string): { root: HTMLElement; body: HTMLElement } {
  const root = el('div', 'style-section')
  const head = el('div', 'section-title', t(titleKey))
  const body = el('div', 'section-body')
  root.append(head, body)
  return { root, body }
}

function fieldRow(labelKey: string, control: HTMLElement, half = false): HTMLElement {
  const row = el('div', `ctl-row${half ? ' half' : ''}`)
  const lab = el('label', 'ctl-label', t(labelKey) === labelKey ? labelKey : t(labelKey))
  row.append(lab, control)
  return row
}

function select(options: { v: string; label: string }[], value: string, on: (v: string) => void): HTMLSelectElement {
  const s = el('select', 'input')
  for (const o of options) {
    const opt = el('option')
    opt.value = o.v
    opt.textContent = o.label
    if (o.v === value) opt.selected = true
    s.appendChild(opt)
  }
  s.addEventListener('change', () => on(s.value))
  return s
}

function range(min: number, max: number, step: number, value: number, on: (v: number) => void): HTMLInputElement {
  const r = el('input', 'range') as HTMLInputElement
  r.type = 'range'
  r.min = String(min)
  r.max = String(max)
  r.step = String(step)
  r.value = String(value)
  r.addEventListener('input', () => on(Number(r.value)))
  return r
}

function colorInput(value: string, on: (v: string) => void): HTMLInputElement {
  const c = el('input', 'color-swatch') as HTMLInputElement
  c.type = 'color'
  c.value = value
  c.addEventListener('input', () => on(c.value))
  return c
}

function segmented(options: { v: string; label: string }[], value: string, on: (v: string) => void): HTMLElement {
  const wrap = el('div', 'segmented')
  for (const o of options) {
    const b = el('button', 'seg-btn', o.label) as HTMLButtonElement
    b.type = 'button'
    if (o.v === value) b.classList.add('active')
    b.addEventListener('click', () => {
      wrap.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('active'))
      b.classList.add('active')
      on(o.v)
    })
    wrap.appendChild(b)
  }
  return wrap
}

function isGradientStyle(style: StyleState): boolean {
  return typeof style.fg === 'object'
}

export function renderStylePanel(container: HTMLElement): void {
  container.innerHTML = ''

  /* ----- Style section ----- */
  const styleSec = section('section.style')
  const style = store.style

  styleSec.body.appendChild(
    fieldRow(
      'style.dotShape',
      select(DOT_SHAPES.map((s) => ({ v: s, label: t(`shape.${s}`) })), style.dotShape, (v) =>
        store.updateStyle({ dotShape: v as DotShape })
      )
    )
  )

  if (store.barcode === 'qr') {
    styleSec.body.appendChild(
      fieldRow(
        'style.cornerSquare',
        select(
          ['square', 'dots', 'extra-rounded'].map((s) => ({ v: s, label: t(`corner.${s}`) })),
          style.cornerSquareShape,
          (v) => store.updateStyle({ cornerSquareShape: v as StyleState['cornerSquareShape'] })
        )
      )
    )
    styleSec.body.appendChild(
      fieldRow(
        'style.cornerDot',
        select(
          ['square', 'dot'].map((s) => ({ v: s, label: t(`cornerDot.${s}`) })),
          style.cornerDotShape,
          (v) => store.updateStyle({ cornerDotShape: v as StyleState['cornerDotShape'] })
        )
      )
    )
  } else {
    styleSec.body.appendChild(el('div', 'hint', t('code.hint')))
  }

  styleSec.body.appendChild(
    fieldRow(
      'style.fgMode',
      segmented(
        [
          { v: 'solid', label: t('fgMode.solid') },
          { v: 'gradient', label: t('fgMode.gradient') }
        ],
        isGradientStyle(style) ? 'gradient' : 'solid',
        (v) => {
          if (v === 'gradient') {
            store.updateStyle({
              fg: {
                type: 'linear',
                rotation: 45,
                colorStops: [
                  { offset: 0, color: typeof style.fg === 'string' ? style.fg : '#6d28d9' },
                  { offset: 1, color: '#0891b2' }
                ]
              }
            })
          } else {
            store.updateStyle({ fg: typeof style.fg === 'string' ? style.fg : style.fg.colorStops[0]?.color ?? '#111827' })
          }
        }
      )
    )
  )

  if (isGradientStyle(style)) {
    const g = style.fg as Exclude<StyleState['fg'], string>
    const two = el('div', 'ctl-pair')
    two.appendChild(fieldRow('style.color1', colorInput(g.colorStops[0]?.color ?? '#6d28d9', (c) => {
      const grad = store.style.fg as Exclude<StyleState['fg'], string>
      store.updateStyle({ fg: { ...grad, colorStops: [ { offset: 0, color: c }, grad.colorStops[1] ?? { offset: 1, color: '#0891b2' } ] } })
    }, ), true))
    two.appendChild(fieldRow('style.color2', colorInput(g.colorStops[1]?.color ?? '#0891b2', (c) => {
      const grad = store.style.fg as Exclude<StyleState['fg'], string>
      store.updateStyle({ fg: { ...grad, colorStops: [ grad.colorStops[0] ?? { offset: 0, color: '#6d28d9' }, { offset: 1, color: c } ] } })
    }, ), true))
    styleSec.body.appendChild(two)
    styleSec.body.appendChild(
      fieldRow('style.angle', range(0, 360, 5, g.rotation ?? 45, (deg) => {
        const grad = store.style.fg as Exclude<StyleState['fg'], string>
        store.updateStyle({ fg: { ...grad, rotation: deg } })
      }))
    )
  } else {
    styleSec.body.appendChild(
      fieldRow('style.color1', colorInput(style.fg as string, (c) => store.updateStyle({ fg: c })))
    )
  }

  const bgRow = el('div', 'ctl-row')
  bgRow.appendChild(el('label', 'ctl-label', t('style.bg')))
  const bgWrap = el('div', 'bg-controls')
  bgWrap.appendChild(colorInput(style.bg, (c) => store.updateStyle({ bg: c })))
  const trans = el('label', 'checkbox-row small')
  const transCb = el('input') as HTMLInputElement
  transCb.type = 'checkbox'
  transCb.checked = style.bgTransparent
  transCb.addEventListener('change', () => store.updateStyle({ bgTransparent: transCb.checked }))
  trans.append(transCb, document.createTextNode(t('style.transparent')))
  bgWrap.appendChild(trans)
  bgRow.appendChild(bgWrap)
  styleSec.body.appendChild(bgRow)

  styleSec.body.appendChild(
    fieldRow('style.margin', range(0, 6, 1, style.margin, (v) => store.updateStyle({ margin: v })))
  )

  const ecSel = select(
    ['L', 'M', 'Q', 'H'].map((e) => ({ v: e, label: t(`ec.${e}`) })),
    style.ecLevel,
    (v) => store.updateStyle({ ecLevel: v as StyleState['ecLevel'] })
  )
  styleSec.body.appendChild(fieldRow('style.ec', ecSel))
  if (style.logo.kind !== 'none' && style.logo.dataUrl) {
    styleSec.body.appendChild(el('div', 'hint', t('ec.autoNote')))
  }

  /* ----- Center art section ----- */
  const logoSec = section('section.logo')
  const logo = style.logo

  logoSec.body.appendChild(
    fieldRow(
      'logo.kind',
      segmented(
        [
          { v: 'none', label: t('logo.none') },
          { v: 'image', label: t('logo.image') },
          { v: 'emoji', label: t('logo.emoji') }
        ],
        logo.kind,
        (v) => {
          const kind = v as LogoKind
          if (kind === 'none') {
            store.setLogo({ kind, dataUrl: null })
          } else if (kind === 'image') {
            if (store.style.logo.dataUrl) {
              store.setLogo({ kind, dataUrl: store.style.logo.dataUrl })
            } else {
              fileInput.click()
              // keep selection; if a file is picked the handler sets kind too
            }
          } else if (kind === 'emoji') {
            if (store.style.logo.emoji) {
              store.setLogo({ kind, dataUrl: rasterizeEmoji(store.style.logo.emoji as string) })
            } else {
              openEmojiPicker((emoji, dataUrl) => store.setLogo({ kind: 'emoji', emoji, dataUrl }))
            }
          }
        }
      )
    )
  )

  const fileInput = el('input') as HTMLInputElement
  fileInput.type = 'file'
  fileInput.accept = 'image/png,image/jpeg,image/webp,image/svg+xml'
  fileInput.hidden = true
  logoSec.body.appendChild(fileInput)
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0]
    if (f) void importFileAsDataUrl(f)
    fileInput.value = ''
  })

  const artControls = el('div', 'art-controls')
  if (logo.kind === 'image') {
    const pickBtn = el('button', 'btn ghost', t('logo.pick')) as HTMLButtonElement
    pickBtn.type = 'button'
    pickBtn.addEventListener('click', () => fileInput.click())
    artControls.appendChild(pickBtn)
  } else if (logo.kind === 'emoji') {
    const emojiBtn = el('button', 'btn ghost', logo.emoji ? `${logo.emoji} ${t('logo.emoji')}` : `😀 ${t('logo.emoji')}`) as HTMLButtonElement
    emojiBtn.type = 'button'
    emojiBtn.addEventListener('click', () => openEmojiPicker((emoji, dataUrl) => store.setLogo({ kind: 'emoji', emoji, dataUrl })))
    artControls.appendChild(emojiBtn)
  }
  if (logo.kind !== 'none') {
    if (logo.kind === 'image' && logo.dataUrl) {
      const thumb = el('img', 'logo-thumb') as HTMLImageElement
      thumb.src = logo.dataUrl
      artControls.appendChild(thumb)
    }
    artControls.appendChild(
      fieldRow('logo.size', range(0.10, 0.35, 0.01, logo.size, (v) => store.setLogo({ size: v })))
    )
    artControls.appendChild(
      fieldRow('logo.margin', range(0, 5, 0.1, logo.margin, (v) => store.setLogo({ margin: v })))
    )
    const hide = el('label', 'checkbox-row')
    const hideCb = el('input') as HTMLInputElement
    hideCb.type = 'checkbox'
    hideCb.checked = logo.hideBackgroundDots
    hideCb.addEventListener('change', () => store.setLogo({ hideBackgroundDots: hideCb.checked }))
    hide.append(hideCb, document.createTextNode(t('logo.hideDots')))
    artControls.appendChild(hide)

    if (logo.kind === 'emoji') {
      const back = el('label', 'checkbox-row')
      const backCb = el('input') as HTMLInputElement
      backCb.type = 'checkbox'
      backCb.checked = logo.backing
      backCb.addEventListener('change', () => store.setLogo({ backing: backCb.checked }))
      back.append(backCb, document.createTextNode(t('logo.backing')))
      artControls.appendChild(back)
    }

    const rm = el('button', 'btn danger ghost', t('logo.remove')) as HTMLButtonElement
    rm.type = 'button'
    rm.addEventListener('click', () => store.setLogo({ kind: 'none', dataUrl: null, emoji: null }))
    artControls.appendChild(rm)
  }
  if (artControls.childElementCount) logoSec.body.appendChild(artControls)
  logoSec.body.appendChild(el('div', 'hint', t('logo.dropHint')))

  container.append(styleSec.root, logoSec.root)
}

export async function importFileAsDataUrl(file: File): Promise<void> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
  store.setLogo({ kind: 'image', dataUrl: url, emoji: null })
}
