/**
 * Batch generation: parse a pasted list / CSV into named code entries.
 *
 * Format (one code per line):
 *   https://example.com                      → content only, name auto-slugged
 *   menu,https://cafe.example.com/menu       → name,content
 *   "row 2","https://example.com/a,b"        → RFC-4180-style quoted fields ("" escapes a quote)
 *   # a comment, skipped                     → blank lines and # comments ignored
 *
 * A header line (`name,content` or `content,name`, case-insensitive) is detected
 * and used for column mapping; extra columns are then ignored. Without a header,
 * 1 field = content, 2 fields = name,content; 3+ fields is an error (quote the
 * field that contains the comma). Inside quoted fields the escape `\n` becomes a
 * real newline, so multi-line payloads (vCard, email body) can be written inline.
 */

export interface BatchEntry {
  name: string
  content: string
}

export type BatchIssueKind =
  | 'missing-content' // name present but no payload
  | 'too-many-columns' // unquoted row with 3+ fields
  | 'limit-reached' // entries beyond the cap were dropped

export interface BatchIssue {
  line: number // 1-based source line
  kind: BatchIssueKind
}

export interface BatchParseResult {
  entries: BatchEntry[]
  issues: BatchIssue[]
}

export const BATCH_LIMIT = 200

/** Same slug rules as the single-export filename: lowercase, non-alnum → '-', trimmed. */
export function slugifyName(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s.slice(0, 40) || 'code'
}

/** Parse one CSV record into fields, honoring double quotes and "" escapes. */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let cur = ''
  let inQuotes = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      // escape hatch inside quotes: \n → newline (lets multi-line payloads ride on one line)
      if (ch === '\\' && line[i + 1] === 'n') {
        cur += '\n'
        i += 2
        continue
      }
      cur += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      fields.push(cur)
      cur = ''
      i++
      continue
    }
    cur += ch
    i++
  }
  fields.push(cur)
  return fields
}

/** Split input into logical records, keeping blank lines out (line numbers preserved for issues). */
function records(raw: string): { line: number; text: string }[] {
  return raw
    .split('\n')
    .map((text, idx) => ({ line: idx + 1, text: text.replace(/\r$/, '').trim() }))
    .filter((r) => r.text !== '' && !r.text.startsWith('#'))
}

/** Detect a `name,content` / `content,name` header row; returns the column index of each role. */
function headerMap(fields: string[]): { nameCol: number; contentCol: number } | null {
  const norm = fields.map((f) => f.trim().toLowerCase())
  const nameCol = norm.indexOf('name')
  const contentCol = norm.indexOf('content')
  if (nameCol === -1 || contentCol === -1 || nameCol === contentCol) return null
  return { nameCol, contentCol }
}

/**
 * Parse batch input into entries. Names are slugged and deduped (`name`, `name-2`,
 * `name-3`, …); auto-named entries derive the slug from the content itself.
 * Never throws — problems come back as issues with source line numbers.
 */
export function parseBatchInput(raw: string, limit = BATCH_LIMIT): BatchParseResult {
  const entries: BatchEntry[] = []
  const issues: BatchIssue[] = []
  const recs = records(raw)
  let nameCol = 0
  let contentCol = 1
  let first = true
  let hasHeader = false
  let limitReported = false
  const usedNames = new Map<string, number>()

  for (const rec of recs) {
    const fields = parseCsvLine(rec.text)

    if (first) {
      first = false
      const hm = headerMap(fields)
      if (hm) {
        nameCol = hm.nameCol
        contentCol = hm.contentCol
        hasHeader = true
        continue // header row is not an entry
      }
    }

    let content: string
    let nameRaw: string
    if (hasHeader) {
      // column roles come from the header; extra columns are ignored
      nameRaw = (fields[nameCol] ?? '').trim()
      content = (fields[contentCol] ?? '').trim()
    } else if (fields.length === 1) {
      content = fields[0].trim()
      nameRaw = ''
    } else if (fields.length === 2) {
      nameRaw = fields[0].trim()
      content = fields[1].trim()
    } else {
      issues.push({ line: rec.line, kind: 'too-many-columns' })
      continue
    }

    if (!content) {
      issues.push({ line: rec.line, kind: 'missing-content' })
      continue
    }

    if (entries.length >= limit) {
      if (!limitReported) {
        issues.push({ line: rec.line, kind: 'limit-reached' })
        limitReported = true
      }
      continue
    }

    const base = slugifyName(nameRaw || content)
    const seen = usedNames.get(base) ?? 0
    usedNames.set(base, seen + 1)
    const name = seen === 0 ? base : `${base}-${seen + 1}`

    entries.push({ name, content })
  }

  return { entries, issues }
}
