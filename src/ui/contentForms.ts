import type { ContentType, FieldDef, TypeDef } from '../types'
import { t } from '../i18n'

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

function buildField(
  def: FieldDef,
  value: string | boolean,
  onChange: (key: string, value: string | boolean) => void
): HTMLElement {
  const label = t(`field.${def.key}`) === `field.${def.key}` ? undefined : t(`field.${def.key}`)

  if (def.type === 'checkbox') {
    const row = el('label', 'checkbox-row')
    const input = el('input') as HTMLInputElement
    input.type = 'checkbox'
    input.checked = value === true
    input.addEventListener('change', () => onChange(def.key, input.checked))
    row.appendChild(input)
    row.appendChild(document.createTextNode(label ?? def.key))
    return row
  }

  const wrap = el('div', `field${def.half ? ' half' : ''}`)
  if (label) {
    const lab = el('label', 'field-label')
    lab.textContent = label
    lab.htmlFor = `f-${def.key}`
    wrap.appendChild(lab)
  }

  if (def.type === 'select') {
    const sel = el('select', 'input')
    sel.id = `f-${def.key}`
    for (const opt of def.options ?? []) {
      const o = el('option')
      o.value = opt.value
      o.textContent = t(opt.labelKey) === opt.labelKey ? opt.labelKey : t(opt.labelKey)
      if (opt.value === value) o.selected = true
      sel.appendChild(o)
    }
    sel.addEventListener('change', () => onChange(def.key, sel.value))
    wrap.appendChild(sel)
    return wrap
  }

  let input: HTMLInputElement | HTMLTextAreaElement
  if (def.type === 'textarea') {
    input = el('textarea', 'input') as HTMLTextAreaElement
    input.rows = 3
  } else {
    input = el('input', 'input') as HTMLInputElement
    input.type = def.type === 'password' ? 'password' : 'text'
    if (def.type === 'number') input.inputMode = 'decimal'
  }
  input.id = `f-${def.key}`
  input.value = String(value ?? '')
  if (def.placeholderKey) input.placeholder = t(def.placeholderKey)
  input.addEventListener('input', () => onChange(def.key, input.value))
  wrap.appendChild(input)
  return wrap
}

export function renderContentForm(
  container: HTMLElement,
  def: TypeDef,
  values: Record<string, string | boolean>,
  activeType: ContentType,
  onChange: (key: string, value: string | boolean) => void
): void {
  container.innerHTML = ''
  for (const field of def.fields) {
    container.appendChild(buildField(field, values[field.key] ?? '', onChange))
  }
  void activeType
}
