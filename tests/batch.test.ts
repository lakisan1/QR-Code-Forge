import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseBatchInput,
  parseCsvLine,
  slugifyName,
  BATCH_LIMIT
} from '../src/core/batch'

test('parseCsvLine splits on commas, honors quotes and "" escapes', () => {
  assert.deepEqual(parseCsvLine('a,b,c'), ['a', 'b', 'c'])
  assert.deepEqual(parseCsvLine('"a,b",c'), ['a,b', 'c'])
  assert.deepEqual(parseCsvLine('"say ""hi""",x'), ['say "hi"', 'x'])
  assert.deepEqual(parseCsvLine('"multi\\nline",y'), ['multi\nline', 'y'])
  assert.deepEqual(parseCsvLine('plain\\nbackslash'), ['plain\\nbackslash'])
})

test('slugifyName lowercases and trims to 40 chars', () => {
  assert.equal(slugifyName('Café Menu 2024!'), 'caf-menu-2024')
  assert.equal(slugifyName('---'), 'code')
  assert.equal(slugifyName('x'.repeat(60)), 'x'.repeat(40))
})

test('plain lines become entries with auto-slugged names', () => {
  const r = parseBatchInput('https://example.com\nhttps://example.org/page')
  assert.deepEqual(
    r.entries.map((e) => e.name),
    ['https-example-com', 'https-example-org-page']
  )
  assert.equal(r.issues.length, 0)
})

test('name,content pairs and quoted fields', () => {
  const r = parseBatchInput('menu,https://cafe.example.com/menu\n"row 2","https://x.example.com/?a=1,b=2"')
  assert.deepEqual(r.entries, [
    { name: 'menu', content: 'https://cafe.example.com/menu' },
    { name: 'row-2', content: 'https://x.example.com/?a=1,b=2' }
  ])
})

test('header row is detected and maps columns (both orders)', () => {
  const a = parseBatchInput('name,content\nmenu,https://x.example.com')
  assert.deepEqual(a.entries, [{ name: 'menu', content: 'https://x.example.com' }])

  const b = parseBatchInput('content,name\nhttps://x.example.com,menu')
  assert.deepEqual(b.entries, [{ name: 'menu', content: 'https://x.example.com' }])
})

test('extra columns are ignored when a header maps them', () => {
  const r = parseBatchInput('name,content,note\nmenu,https://x.example.com,cafe\n')
  assert.deepEqual(r.entries, [{ name: 'menu', content: 'https://x.example.com' }])
})

test('blank lines and # comments are skipped', () => {
  const r = parseBatchInput('# list for july\n\nhttps://example.com\n   \nhttps://example.org')
  assert.equal(r.entries.length, 2)
  assert.equal(r.issues.length, 0)
})

test('CRLF line endings are handled', () => {
  const r = parseBatchInput('menu,https://x.example.com\r\nshop,https://y.example.com\r\n')
  assert.equal(r.entries.length, 2)
  assert.deepEqual(r.entries[0], { name: 'menu', content: 'https://x.example.com' })
})

test('missing content is an issue, empty input is empty', () => {
  const r = parseBatchInput('only-a-name,')
  assert.equal(r.entries.length, 0)
  assert.deepEqual(r.issues, [{ line: 1, kind: 'missing-content' }])

  assert.deepEqual(parseBatchInput('   \n# nothing\n'), { entries: [], issues: [] })
})

test('3+ columns without a header are rejected with a line number', () => {
  const r = parseBatchInput('name,https://x.example.com,extra')
  assert.equal(r.entries.length, 0)
  assert.deepEqual(r.issues, [{ line: 1, kind: 'too-many-columns' }])
})

test('duplicate names are deduped with -2, -3 suffixes', () => {
  const r = parseBatchInput('wifi,https://a.example.com\nwifi,https://b.example.com\nwifi,https://c.example.com')
  assert.deepEqual(
    r.entries.map((e) => e.name),
    ['wifi', 'wifi-2', 'wifi-3']
  )
})

test('entries are capped at BATCH_LIMIT with a single issue', () => {
  const raw = Array.from({ length: BATCH_LIMIT + 25 }, (_, i) => `code-${i},https://x.example.com/${i}`).join('\n')
  const r = parseBatchInput(raw)
  assert.equal(r.entries.length, BATCH_LIMIT)
  assert.equal(r.issues.length, 1)
  assert.equal(r.issues[0].kind, 'limit-reached')
  assert.equal(r.issues[0].line, BATCH_LIMIT + 1)
})

test('auto names derive from content and still dedupe', () => {
  const r = parseBatchInput('https://x.example.com\nhttps://x.example.com')
  assert.deepEqual(
    r.entries.map((e) => e.name),
    ['https-x-example-com', 'https-x-example-com-2']
  )
})
