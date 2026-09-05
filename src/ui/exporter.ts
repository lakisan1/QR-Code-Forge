import { store } from '../core/store'
import { t } from '../i18n'

const SIZES = [256, 512, 768, 1024, 2048]

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

export interface ExportCallbacks {
  onSave: () => void
  onCopy: () => void
}

export function renderExportRow(container: HTMLElement, cb: ExportCallbacks): void {
  container.innerHTML = ''
  container.appendChild(el('div', 'section-title', t('section.export')))

  const controls = el('div', 'export-controls')

  const fmtSel = el('select', 'input') as HTMLSelectElement
  for (const f of ['png', 'jpeg', 'svg'] as const) {
    const o = el('option')
    o.value = f
    o.textContent = f.toUpperCase()
    if (f === store.exportFormat) o.selected = true
    fmtSel.appendChild(o)
  }
  fmtSel.addEventListener('change', () => store.setExport({ exportFormat: fmtSel.value as typeof store.exportFormat }))
  controls.appendChild(fmtSel)

  const sizeSel = el('select', 'input') as HTMLSelectElement
  for (const s of SIZES) {
    const o = el('option')
    o.value = String(s)
    o.textContent = t('sizeLabel', { n: s })
    if (s === store.exportSize) o.selected = true
    sizeSel.appendChild(o)
  }
  sizeSel.addEventListener('change', () => store.setExport({ exportSize: Number(sizeSel.value) }))
  controls.appendChild(sizeSel)

  container.appendChild(controls)

  const qualityWrap = el('div', 'quality-wrap')
  qualityWrap.appendChild(el('label', 'ctl-label', t('export.quality')))
  const q = el('input', 'range') as HTMLInputElement
  q.type = 'range'
  q.min = '0.5'
  q.max = '1'
  q.step = '0.01'
  q.value = String(store.exportQuality)
  q.addEventListener('input', () => store.setExport({ exportQuality: Number(q.value) }))
  qualityWrap.appendChild(q)
  if (store.exportFormat === 'jpeg') qualityWrap.classList.add('visible')
  container.appendChild(qualityWrap)

  const buttons = el('div', 'export-buttons')
  const save = el('button', 'btn primary', `💾 ${t('export.save')}`) as HTMLButtonElement
  save.type = 'button'
  save.addEventListener('click', cb.onSave)
  const copy = el('button', 'btn', `📋 ${t('export.copy')}`) as HTMLButtonElement
  copy.type = 'button'
  copy.addEventListener('click', cb.onCopy)
  buttons.append(save, copy)
  container.appendChild(buttons)
}
