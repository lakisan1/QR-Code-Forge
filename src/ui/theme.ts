import { store } from '../core/store'
import { t } from '../i18n'

export function applyTheme(): void {
  document.documentElement.dataset.theme = store.theme
  const btn = document.querySelector<HTMLButtonElement>('#theme-toggle')
  if (btn) {
    btn.textContent = store.theme === 'dark' ? '☀️' : '🌙'
    btn.title = store.theme === 'dark' ? t('theme.toLight') : t('theme.toDark')
  }
}

export function initTheme(): void {
  applyTheme()
  document.querySelector<HTMLButtonElement>('#theme-toggle')?.addEventListener('click', () => {
    store.setTheme(store.theme === 'dark' ? 'light' : 'dark')
  })
}
