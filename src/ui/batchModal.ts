import JSZip from 'jszip'
import { store, effectiveStyle } from '../core/store'
import { parseBatchInput, BATCH_LIMIT } from '../core/batch'
import { renderExport, blobToBase64, type ExportFormat } from '../core/encode'
import { t } from '../i18n'

const SIZES = [256, 512, 768, 1024, 2048, 4096]

const SAMPLE = [
  'https://example.com',
  'menu,https://cafe.example.com/menu',
  'shop,"https://shop.example.com/?a=1,b=2"'
].join('\n')

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

let opened = false

/** Opens the batch-generation modal. Renders every line with the CURRENT style & barcode kind. */
export function openBatchModal(): void {
  if (opened) return
  opened = true

  let generating = false
  let cancelled = false
  const overlay = el('div', 'batch-overlay')
  const dialog = el('div', 'batch-dialog')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')

  /* header */
  const header = el('div', 'batch-header')
  header.appendChild(el('h2', 'batch-title', `📦 ${t('batch.title')}`))
  const closeBtn = el('button', 'icon-btn', '✕') as HTMLButtonElement
  closeBtn.type = 'button'
  closeBtn.title = t('batch.close')
  header.appendChild(closeBtn)
  dialog.appendChild(header)

  dialog.appendChild(el('p', 'batch-hint', t('batch.hint')))

  /* textarea + import */
  const summary = el('span', 'batch-summary')
  const ta = el('textarea', 'batch-input') as HTMLTextAreaElement
  ta.spellcheck = false
  ta.rows = 8
  ta.placeholder = SAMPLE
  dialog.appendChild(ta)

  const fileRow = el('div', 'batch-file-row')
  const importBtn = el('button', 'btn', `📂 ${t('batch.import')}`) as HTMLButtonElement
  importBtn.type = 'button'
  const fileInput = el('input') as HTMLInputElement
  fileInput.type = 'file'
  fileInput.accept = '.csv,.txt,text/csv,text/plain'
  fileInput.hidden = true
  importBtn.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      ta.value = typeof reader.result === 'string' ? reader.result : ''
      onInput()
    }
    reader.readAsText(f)
    fileInput.value = ''
  })
  fileRow.appendChild(importBtn)
  fileRow.appendChild(fileInput)
  fileRow.appendChild(summary)
  dialog.appendChild(fileRow)

  /* options */
  const options = el('div', 'export-controls')

  const fmtSel = el('select', 'input') as HTMLSelectElement
  for (const f of ['png', 'jpeg', 'svg'] as const) {
    const o = el('option')
    o.value = f
    o.textContent = f.toUpperCase()
    if (f === store.exportFormat) o.selected = true
    fmtSel.appendChild(o)
  }
  options.appendChild(fmtSel)

  const sizeSel = el('select', 'input') as HTMLSelectElement
  for (const s of SIZES) {
    const o = el('option')
    o.value = String(s)
    o.textContent = t('sizeLabel', { n: s })
    if (s === store.exportSize) o.selected = true
    sizeSel.appendChild(o)
  }
  options.appendChild(sizeSel)
  dialog.appendChild(options)

  /* actions */
  const actions = el('div', 'export-buttons')
  const generate = el('button', 'btn primary', `⚙ ${t('batch.generate')}`) as HTMLButtonElement
  generate.type = 'button'
  actions.appendChild(generate)
  dialog.appendChild(actions)

  const progress = el('div', 'batch-progress')
  progress.hidden = true
  dialog.appendChild(progress)

  overlay.appendChild(dialog)

  /* ---------- parsing / summary ---------- */

  function currentEntries() {
    return parseBatchInput(ta.value)
  }

  function paintSummary(): { entries: ReturnType<typeof currentEntries>['entries'] } {
    const { entries, issues } = currentEntries()
    if (ta.value.trim() === '') {
      summary.textContent = ''
      summary.className = 'batch-summary'
    } else if (entries.length === 0) {
      summary.textContent = `⚠ ${t('batch.empty')}`
      summary.className = 'batch-summary bad'
    } else {
      const dropped = issues.filter((i) => i.kind !== 'limit-reached').length
      const capped = issues.some((i) => i.kind === 'limit-reached')
      let s = `✓ ${t('batch.summary.ready', { n: entries.length })}`
      if (dropped > 0) s += ` · ⚠ ${t('batch.summary.issues', { n: dropped })}`
      if (capped) s += ` · ⚠ ${t('batch.limit', { n: BATCH_LIMIT })}`
      summary.textContent = s
      summary.className = 'batch-summary ok'
    }
    generate.disabled = generating || currentEntries().entries.length === 0
    return { entries }
  }

  function onInput(): void {
    if (generating) return
    paintSummary()
  }
  ta.addEventListener('input', onInput)

  /* ---------- lifecycle ---------- */

  function close(): void {
    if (generating) cancelled = true
    opened = false
    document.removeEventListener('keydown', onKey)
    overlay.remove()
  }
  closeBtn.addEventListener('click', close)
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close()
  })
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
    }
  }
  document.addEventListener('keydown', onKey)

  /* ---------- generation ---------- */

  async function run(): Promise<void> {
    const { entries } = paintSummary()
    if (entries.length === 0) return

    generating = true
    cancelled = false
    generate.disabled = true
    ta.disabled = true
    fmtSel.disabled = true
    sizeSel.disabled = true
    importBtn.disabled = true
    progress.hidden = false

    const format = fmtSel.value as ExportFormat
    const size = Number(sizeSel.value)
    const style = effectiveStyle(store.style)
    const ext = format === 'jpeg' ? 'jpg' : format
    const zip = new JSZip()
    const failed: string[] = []
    let done = 0

    try {
      for (const entry of entries) {
        if (cancelled) break
        progress.textContent = t('batch.rendering', { done: done + 1, total: entries.length })
        try {
          const blob = await renderExport(store.barcode, entry.content, style, size, format, store.exportQuality)
          zip.file(`${entry.name}.${ext}`, blob)
        } catch {
          failed.push(entry.name)
        }
        done++
      }

      if (!cancelled && done > failed.length) {
        const useDeflate = format === 'svg'
        const blob = await zip.generateAsync(
          { type: 'blob', compression: useDeflate ? 'DEFLATE' : 'STORE' },
          (meta) => {
            progress.textContent = t('batch.zipping', { percent: Math.round(meta.percent) })
          }
        )
        const base64 = await blobToBase64(blob)
        progress.textContent = `💾 ${t('batch.saving')}`
        const res = await window.forge.saveExport({
          defaultName: `qrcode-forge-batch-${size}px.zip`,
          mime: 'application/zip',
          base64
        })
        if (res.saved && res.filePath) {
          const names = failed.slice(0, 3).join(', ')
          const more = failed.length > 3 ? ` +${failed.length - 3}` : ''
          progress.textContent = failed.length
            ? `⚠ ${t('batch.partial', { ok: done - failed.length, failed: failed.length })} (${names}${more})`
            : `✓ ${t('batch.saved', { path: res.filePath.split(/[/\\]/).pop() ?? res.filePath })}`
        } else if (res.error) {
          progress.textContent = `⚠ ${t('batch.failed', { msg: res.error })}`
        } else {
          progress.textContent = t('export.canceled')
        }
      } else if (cancelled) {
        progress.textContent = t('batch.canceled')
      } else {
        progress.textContent = `⚠ ${t('batch.failed', { msg: 'all entries failed to render' })}`
      }
    } catch (err) {
      progress.textContent = `⚠ ${t('batch.failed', { msg: String(err instanceof Error ? err.message : err) })}`
    } finally {
      generating = false
      cancelled = false
      generate.disabled = currentEntries().entries.length === 0
      ta.disabled = false
      fmtSel.disabled = false
      sizeSel.disabled = false
      importBtn.disabled = false
    }
  }
  generate.addEventListener('click', () => void run())

  document.body.appendChild(overlay)
  paintSummary()
  ta.focus()
}
