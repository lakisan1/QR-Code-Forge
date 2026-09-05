import en from './en.json'

type Dict = Record<string, string>

const dicts: Record<string, Dict> = { en: en as Dict }

let current = 'en'

export function t(key: string, vars?: Record<string, string | number>): string {
  let s: string = dicts[current]?.[key] ?? dicts.en[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v))
    }
  }
  return s
}

export function availableLanguages(): string[] {
  return Object.keys(dicts)
}

/** Adding a language later = dropping `xx.json` next to en.json and registering it here. */
export function registerLanguage(code: string, dict: Dict): void {
  dicts[code] = dict
}
