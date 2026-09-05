import type { HistoryEntry } from '../types'
import { store } from '../core/store'
import { t } from '../i18n'
import { CONTENT_TYPES } from '../core/payload'

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

export function renderHistoryPanel(container: HTMLElement, onRestore: (entry: HistoryEntry) => void): void {
  container.innerHTML = ''
  const head = el('div', 'history-head')
  head.appendChild(el('div', 'section-title', t('section.history')))
  if (store.history.length) {
    const clear = el('button', 'btn tiny ghost', t('history.clear')) as HTMLButtonElement
    clear.type = 'button'
    clear.addEventListener('click', () => store.clearHistory())
    head.appendChild(clear)
  }
  container.appendChild(head)

  if (!store.history.length) {
    container.appendChild(el('div', 'history-empty', t('history.empty')))
    return
  }

  const list = el('div', 'history-list')
  for (const entry of store.history) {
    const icon = CONTENT_TYPES.find((d) => d.type === entry.type)?.icon ?? '🔗'
    const card = el('div', 'history-card')
    const main = el('button', 'history-main') as HTMLButtonElement
    main.type = 'button'
    main.title = t('history.restore')
    const time = new Date(entry.ts)
    main.innerHTML = `
      <span class="history-icon">${icon}</span>
      <span class="history-texts">
        <span class="history-title"></span>
        <span class="history-sub"></span>
      </span>`
    ;(main.querySelector('.history-title') as HTMLElement).textContent = entry.title || entry.type
    ;(main.querySelector('.history-sub') as HTMLElement).textContent = entry.subtitle
    main.addEventListener('click', () => onRestore(entry))
    const rm = el('button', 'history-rm') as HTMLButtonElement
    rm.type = 'button'
    rm.textContent = '✕'
    rm.title = t('history.remove')
    rm.addEventListener('click', (e) => {
      e.stopPropagation()
      store.removeHistory(entry.id)
    })
    card.append(main, rm)
    card.dataset.time = time.toISOString()
    list.appendChild(card)
  }
  container.appendChild(list)
}
