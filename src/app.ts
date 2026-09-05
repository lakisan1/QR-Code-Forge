import './style.css'
import type { BarcodeKind, HistoryEntry } from './types'
import { store, effectiveStyle } from './core/store'
import { buildPayload, CONTENT_TYPES, typeDef } from './core/payload'
import { QRPreview, renderExport, blobToBase64 } from './core/encode'
import { renderContentForm } from './ui/contentForms'
import { renderStylePanel, importFileAsDataUrl } from './ui/stylePanel'
import { renderExportRow } from './ui/exporter'
import { openBatchModal } from './ui/batchModal'
import { renderHistoryPanel } from './ui/historyPanel'
import { initTheme, applyTheme } from './ui/theme'
import { t } from './i18n'

const PREVIEW_SIZE = 512

const qs = <T extends HTMLElement>(sel: string): T => {
  const node = document.querySelector<T>(sel)
  if (!node) throw new Error(`missing element: ${sel}`)
  return node
}

const typeTabs = qs<HTMLElement>('#type-tabs')
const formHost = qs<HTMLElement>('#content-form')
const payloadBox = qs<HTMLElement>('#payload-box')
const payloadText = qs<HTMLElement>('#payload-text')
const payloadChars = qs<HTMLElement>('#payload-chars')
const payloadLabel = qs<HTMLElement>('#payload-box .payload-label')
const barcodeSwitch = qs<HTMLElement>('#barcode-switch')
const qrStage = qs<HTMLElement>('#qr-stage')
const emptyHint = qs<HTMLElement>('#empty-hint')
const modulesLine = qs<HTMLElement>('#modules-line')
const statusMsg = qs<HTMLElement>('#status-msg')
const footerVersion = qs<HTMLElement>('#footer-version')
const brandTagline = qs<HTMLElement>('.brand-tagline')

const preview = new QRPreview(qs<HTMLElement>('#qr-host'), qs<HTMLCanvasElement>('#qr-matrix'))

/* ---------- helpers ---------- */

function currentPayload() {
  return buildPayload(store.activeType, store.values[store.activeType])
}

function setStatus(message: string): void {
  statusMsg.textContent = message
}

function slug(title: string): string {
  const s = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s.slice(0, 40) || 'code'
}

function baseName(p: string): string {
  return p.split(/[/\\]/).pop() ?? p
}

function newId(): string {
  return crypto.randomUUID?.() ?? `h${Date.now()}${Math.floor(Math.random() * 1e6)}`
}

/* ---------- content type tabs ---------- */

function paintTabs(): void {
  typeTabs.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.type === store.activeType)
  })
}

function buildTabs(): void {
  typeTabs.innerHTML = ''
  for (const def of CONTENT_TYPES) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'tab'
    b.dataset.type = def.type
    b.innerHTML = `<span class="tab-icon">${def.icon}</span><span class="tab-name">${t(`tab.${def.type}`)}</span>`
    b.addEventListener('click', () => store.setActiveType(def.type))
    typeTabs.appendChild(b)
  }
  paintTabs()
}

/* ---------- content form ---------- */

function renderForm(): void {
  const def = typeDef(store.activeType)
  renderContentForm(formHost, def, store.values[store.activeType], store.activeType, (key, value) =>
    store.setValue(store.activeType, key, value)
  )
}

/* ---------- barcode kind switch ---------- */

const BARCODES: { kind: BarcodeKind; labelKey: string }[] = [
  { kind: 'qr', labelKey: 'code.qr' },
  { kind: 'aztec', labelKey: 'code.aztec' },
  { kind: 'datamatrix', labelKey: 'code.datamatrix' }
]

function paintBarcodeSwitch(): void {
  barcodeSwitch.querySelectorAll<HTMLButtonElement>('.seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.kind === store.barcode)
  })
}

function buildBarcodeSwitch(): void {
  barcodeSwitch.innerHTML = ''
  for (const { kind, labelKey } of BARCODES) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'seg-btn'
    b.dataset.kind = kind
    b.textContent = t(labelKey)
    b.addEventListener('click', () => store.setBarcode(kind))
    barcodeSwitch.appendChild(b)
  }
  paintBarcodeSwitch()
}

/* ---------- preview ---------- */

let scheduled: number | undefined

function scheduleRefresh(): void {
  if (scheduled !== undefined) return
  scheduled = window.setTimeout(() => {
    scheduled = undefined
    void refreshPreview()
  }, 130)
}

async function refreshPreview(): Promise<void> {
  const p = currentPayload()
  if (!p.ok) {
    emptyHint.hidden = false
    emptyHint.textContent = p.errorKey ? t(p.errorKey) : t('status.empty')
    qrStage.classList.add('idle')
    setStatus('')
    payloadBox.hidden = true
    return
  }
  payloadBox.hidden = false
  qrStage.classList.remove('idle')
  emptyHint.hidden = true
  payloadText.textContent = p.text
  payloadChars.textContent = `${p.text.length}`
  payloadLabel.textContent = 'payload'

  try {
    const info = await preview.update(store.barcode, p.text, effectiveStyle(store.style), PREVIEW_SIZE)
    if (info) {
      modulesLine.textContent =
        info.cols === info.rows
          ? t('status.modules', { n: info.cols })
          : `${info.cols} × ${info.rows} modules`
    } else {
      modulesLine.textContent = ''
    }
    setStatus(`✓ ${t('status.ready')}`)
  } catch (err) {
    modulesLine.textContent = ''
    setStatus(`⚠ ${String(err instanceof Error ? err.message : err)}`)
  }
}

/* ---------- export / copy / history ---------- */

async function doSave(): Promise<void> {
  const p = currentPayload()
  if (!p.ok) return
  try {
    const blob = await renderExport(
      store.barcode,
      p.text,
      effectiveStyle(store.style),
      store.exportSize,
      store.exportFormat,
      store.exportQuality
    )
    const ext = store.exportFormat === 'jpeg' ? 'jpg' : store.exportFormat
    const mime =
      store.exportFormat === 'svg'
        ? 'image/svg+xml'
        : store.exportFormat === 'jpeg'
          ? 'image/jpeg'
          : 'image/png'
    const base64 = await blobToBase64(blob)
    const defaultName = `qrcode-forge-${slug(p.title)}.${ext}`
    const res = await window.forge.saveExport({ defaultName, mime, base64 })
    if (res.saved && res.filePath) {
      setStatus(`💾 ${t('export.saved', { path: baseName(res.filePath) })}`)
      pushHistory()
    } else if (res.error) {
      setStatus(`⚠ ${t('export.failed', { msg: res.error })}`)
    } else {
      setStatus(t('export.canceled'))
    }
  } catch (err) {
    setStatus(`⚠ ${t('export.failed', { msg: String(err) })}`)
  }
}

async function doCopy(): Promise<void> {
  const p = currentPayload()
  if (!p.ok) return
  try {
    const blob = await renderExport(store.barcode, p.text, effectiveStyle(store.style), store.exportSize, 'png')
    const base64 = await blobToBase64(blob)
    const ok = await window.forge.copyImage(base64)
    if (ok) {
      setStatus(`📋 ${t('export.copied')}`)
      pushHistory()
    } else {
      setStatus('⚠ clipboard failed')
    }
  } catch (err) {
    setStatus(`⚠ ${t('export.failed', { msg: String(err) })}`)
  }
}

function pushHistory(): void {
  const p = currentPayload()
  const entry: HistoryEntry = {
    id: newId(),
    ts: Date.now(),
    type: store.activeType,
    barcode: store.barcode,
    title: p.title,
    subtitle: p.text.slice(0, 48) + (p.text.length > 48 ? '…' : ''),
    content: { ...store.values[store.activeType] },
    style: structuredClone(effectiveStyle(store.style))
  }
  store.addHistory(entry)
}

function restoreEntry(entry: HistoryEntry): void {
  store.restoreEntry(entry)
  setStatus(`↩ ${entry.title || entry.type}`)
}

/* ---------- drag & drop logo ---------- */

function setupDropZone(): void {
  for (const evt of ['dragenter', 'dragover']) {
    qrStage.addEventListener(evt, (e) => {
      e.preventDefault()
      qrStage.classList.add('drag')
    })
  }
  for (const evt of ['dragleave', 'drop']) {
    qrStage.addEventListener(evt, (e) => {
      e.preventDefault()
      qrStage.classList.remove('drag')
    })
  }
  qrStage.addEventListener('drop', (e) => {
    const f = (e as DragEvent).dataTransfer?.files?.[0]
    if (f && f.type.startsWith('image/')) void importFileAsDataUrl(f)
  })
}

/* ---------- store subscriptions ---------- */

function onStore(reason: Parameters<Parameters<typeof store.on>[0]>[0]): void {
  switch (reason) {
    case 'type':
      paintTabs()
      renderForm()
      scheduleRefresh()
      break
    case 'barcode':
      paintBarcodeSwitch()
      renderStylePanel(qs<HTMLElement>('#style-panel'))
      scheduleRefresh()
      break
    case 'restore':
      paintTabs()
      paintBarcodeSwitch()
      renderForm()
      renderStylePanel(qs<HTMLElement>('#style-panel'))
      scheduleRefresh()
      break
    case 'style':
    case 'form':
      scheduleRefresh()
      break
    case 'theme':
      applyTheme()
      break
    case 'history':
      renderHistoryPanel(qs<HTMLElement>('#history-panel'), restoreEntry)
      break
    case 'export':
      break
  }
}

/* ---------- boot ---------- */

async function boot(): Promise<void> {
  buildTabs()
  buildBarcodeSwitch()
  renderForm()
  renderStylePanel(qs<HTMLElement>('#style-panel'))
  renderHistoryPanel(qs<HTMLElement>('#history-panel'), restoreEntry)
  renderExportRow(qs<HTMLElement>('#export-row'), {
    onSave: () => void doSave(),
    onCopy: () => void doCopy(),
    onBatch: () => openBatchModal()
  })
  initTheme()
  applyTheme()
  setupDropZone()

  store.on(onStore)

  brandTagline.textContent = t('app.tagline')

  try {
    const info = await window.forge.getInfo()
    footerVersion.textContent = t('footer.made', { version: info.version })
  } catch {
    footerVersion.textContent = t('footer.made', { version: '1.0.0' })
  }

  // first paint
  await refreshPreview()
}

void boot()
