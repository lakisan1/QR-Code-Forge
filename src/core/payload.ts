import type { ContentType, TypeDef } from '../types'

export interface PayloadResult {
  text: string
  ok: boolean
  errorKey?: string
  title: string
}

/** Registry of every content type and the form fields it needs. */
export const CONTENT_TYPES: TypeDef[] = [
  {
    type: 'text',
    icon: '🔗',
    fields: [{ key: 'data', type: 'textarea', required: true, placeholderKey: 'ph.text.data' }]
  },
  {
    type: 'wifi',
    icon: '📶',
    fields: [
      { key: 'ssid', type: 'text', required: true, placeholderKey: 'ph.wifi.ssid', half: true },
      { key: 'password', type: 'password', half: true },
      {
        key: 'security',
        type: 'select',
        options: [
          { value: 'WPA', labelKey: 'sec.WPA' },
          { value: 'WEP', labelKey: 'sec.WEP' },
          { value: 'nopass', labelKey: 'sec.nopass' }
        ]
      },
      { key: 'hidden', type: 'checkbox' }
    ]
  },
  {
    type: 'vcard',
    icon: '👤',
    fields: [
      { key: 'firstName', type: 'text', half: true },
      { key: 'lastName', type: 'text', half: true },
      { key: 'org', type: 'text', half: true },
      { key: 'phone', type: 'text', half: true },
      { key: 'email', type: 'text', half: true },
      { key: 'url', type: 'text', half: true },
      { key: 'note', type: 'text' }
    ]
  },
  {
    type: 'email',
    icon: '✉️',
    fields: [
      { key: 'to', type: 'text', required: true, placeholderKey: 'ph.email.to' },
      { key: 'subject', type: 'text' },
      { key: 'body', type: 'textarea' }
    ]
  },
  {
    type: 'sms',
    icon: '💬',
    fields: [
      { key: 'phone', type: 'text', required: true },
      { key: 'message', type: 'textarea' }
    ]
  },
  {
    type: 'tel',
    icon: '📞',
    fields: [{ key: 'phone', type: 'text', required: true }]
  },
  {
    type: 'geo',
    icon: '📍',
    fields: [
      { key: 'lat', type: 'text', required: true, half: true, placeholderKey: 'ph.geo.lat' },
      { key: 'lng', type: 'text', required: true, half: true, placeholderKey: 'ph.geo.lng' }
    ]
  },
  {
    type: 'whatsapp',
    icon: '🟢',
    fields: [
      { key: 'phone', type: 'text', required: true, placeholderKey: 'ph.whatsapp.phone' },
      { key: 'message', type: 'textarea', placeholderKey: 'ph.whatsapp.message' }
    ]
  }
]

export function typeDef(type: ContentType): TypeDef {
  const def = CONTENT_TYPES.find((t) => t.type === type)
  if (!def) throw new Error(`unknown content type: ${type}`)
  return def
}

/* ---------- escaping helpers (exported for tests) ---------- */

/** WiFi payload grammar: backslash-escape the special characters `\ ; , : "`. */
export function escapeWifi(s: string): string {
  return s.replace(/[\\;,:"]/g, (c) => '\\' + c)
}

/** vCard value escaping: `\ ; ,` and raw newlines. */
export function escapeVCard(s: string): string {
  return s.replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n')
}

/** WhatsApp click-to-chat numbers: digits only (country code, no +). */
export function waDigits(s: string): string {
  return s.replace(/\D/g, '')
}

/** tel:/SMSTO: numbers: digits and a leading + survive. */
export function phoneDigits(s: string): string {
  return s.replace(/[^\d+]/g, '')
}

function fmtCoord(s: string): number | null {
  const n = Number.parseFloat(s.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function snippet(s: string, n: number): string {
  const t = s.trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

/* ---------- builders ---------- */

export function buildPayload(
  type: ContentType,
  v: Record<string, string | boolean>
): PayloadResult {
  const str = (k: string): string => String(v[k] ?? '').trim()

  const fail = (errorKey: string): PayloadResult => ({ text: '', ok: false, errorKey, title: '' })
  const ok = (text: string, title: string): PayloadResult => ({
    text,
    ok: true,
    title: snippet(title, 32) || snippet(text, 32)
  })

  switch (type) {
    case 'text': {
      const data = String(v.data ?? '')
      if (!data.trim()) return fail('err.contentRequired')
      return ok(data, data)
    }

    case 'wifi': {
      const ssid = str('ssid')
      if (!ssid) return fail('err.ssidRequired')
      const security = str('security') || 'WPA'
      const psk = String(v.password ?? '')
      if (security !== 'nopass' && !psk) return fail('err.pskRequired')
      const parts = [`WIFI:T:${security}`, `S:${escapeWifi(ssid)}`]
      if (security !== 'nopass') parts.push(`P:${escapeWifi(psk)}`)
      if (v.hidden === true) parts.push('H:true')
      return ok(parts.join(';') + ';', ssid)
    }

    case 'vcard': {
      const first = str('firstName')
      const last = str('lastName')
      const org = str('org')
      const phone = phoneDigits(str('phone'))
      const email = str('email')
      const url = str('url')
      const note = str('note')
      if (!first && !last && !org && !phone && !email) return fail('err.contentRequired')
      const fn = [first, last].filter(Boolean).join(' ') || org
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escapeVCard(last)};${escapeVCard(first)};;;`, `FN:${escapeVCard(fn)}`]
      if (org) lines.push(`ORG:${escapeVCard(org)}`)
      if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(phone)}`)
      if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(email)}`)
      if (url) lines.push(`URL:${escapeVCard(url)}`)
      if (note) lines.push(`NOTE:${escapeVCard(note)}`)
      lines.push('END:VCARD')
      return ok(lines.join('\r\n'), fn)
    }

    case 'email': {
      const to = str('to')
      if (!to) return fail('err.emailRequired')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail('err.emailInvalid')
      const subject = String(v.subject ?? '')
      const body = String(v.body ?? '')
      const q: string[] = []
      if (subject) q.push(`subject=${encodeURIComponent(subject)}`)
      if (body) q.push(`body=${encodeURIComponent(body)}`)
      return ok(`mailto:${to}${q.length ? '?' + q.join('&') : ''}`, to)
    }

    case 'sms': {
      const phone = phoneDigits(str('phone'))
      if (!phone) return fail('err.phoneRequired')
      const message = String(v.message ?? '')
      return ok(`SMSTO:${phone}:${message}`, phone)
    }

    case 'tel': {
      const phone = phoneDigits(str('phone'))
      if (!phone) return fail('err.phoneRequired')
      return ok(`tel:${phone}`, phone)
    }

    case 'geo': {
      const lat = fmtCoord(str('lat'))
      const lng = fmtCoord(str('lng'))
      if (lat === null || lng === null) {
        if (str('lat') === '' && str('lng') === '') return fail('err.coordsRequired')
        return fail('err.coordsRequired')
      }
      if (lat < -90 || lat > 90) return fail('err.latRange')
      if (lng < -180 || lng > 180) return fail('err.lngRange')
      const fmt = (n: number): string => String(Number(n.toFixed(6)))
      return ok(`geo:${fmt(lat)},${fmt(lng)}`, `${fmt(lat)}, ${fmt(lng)}`)
    }

    case 'whatsapp': {
      const phone = waDigits(str('phone'))
      if (!phone) return fail('err.phoneRequired')
      const message = String(v.message ?? '')
      const text = message ? `?text=${encodeURIComponent(message)}` : ''
      return ok(`https://wa.me/${phone}${text}`, phone)
    }
  }
}
