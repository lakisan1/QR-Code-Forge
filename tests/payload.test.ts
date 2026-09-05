import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPayload,
  escapeWifi,
  escapeVCard,
  waDigits,
  phoneDigits
} from '../src/core/payload'

test('escapeWifi escapes the WiFi special set', () => {
  assert.equal(escapeWifi('a;b:c,d"e\\f'), 'a\\;b\\:c\\,d\\"e\\\\f')
  assert.equal(escapeWifi('plain'), 'plain')
})

test('escapeVCard escapes separators and newlines', () => {
  assert.equal(escapeVCard('a;b,c\\d'), 'a\\;b\\,c\\\\d')
  assert.equal(escapeVCard('line1\nline2'), 'line1\\nline2')
})

test('waDigits strips everything but digits (no plus)', () => {
  assert.equal(waDigits('+49 (170) 123-4567'), '491701234567')
})

test('phoneDigits keeps a leading plus', () => {
  assert.equal(phoneDigits('+49 (170) 123'), '+49170123')
})

test('text: empty content is rejected', () => {
  assert.equal(buildPayload('text', { data: '   ' }).ok, false)
  assert.equal(buildPayload('text', { data: 'Hello' }).text, 'Hello')
})

test('wifi: full payload with WPA and hidden flag', () => {
  const r = buildPayload('wifi', { ssid: 'Café 5G', password: 'pw;1', security: 'WPA', hidden: true })
  assert.equal(r.ok, true)
  assert.equal(r.text, 'WIFI:T:WPA;S:Café 5G;P:pw\\;1;H:true;')
})

test('wifi: nopass omits password, missing SSID fails', () => {
  const r = buildPayload('wifi', { ssid: 'open', security: 'nopass' })
  assert.equal(r.text, 'WIFI:T:nopass;S:open;')
  assert.equal(buildPayload('wifi', { ssid: '', password: 'x' }).errorKey, 'err.ssidRequired')
  assert.equal(buildPayload('wifi', { ssid: 'net', security: 'WPA', password: '' }).errorKey, 'err.pskRequired')
})

test('vcard: CRLF line endings, FN, escaping, optional fields skipped', () => {
  const r = buildPayload('vcard', {
    firstName: 'Ada',
    lastName: 'Lovelace',
    org: 'Analytical; Engines',
    phone: '+44 20 1234',
    email: 'ada@example.com',
    url: '',
    note: ''
  })
  assert.equal(r.ok, true)
  const lines = r.text.split('\r\n')
  assert.equal(lines[0], 'BEGIN:VCARD')
  assert.equal(lines[2], 'N:Lovelace;Ada;;;')
  assert.equal(lines[3], 'FN:Ada Lovelace')
  assert.equal(lines[4], 'ORG:Analytical\\; Engines')
  assert.equal(lines[5], 'TEL;TYPE=CELL:+44201234')
  assert.equal(lines[lines.length - 1], 'END:VCARD')
  assert.ok(!r.text.includes('URL:'))
})

test('email: mailto with encoded subject/body', () => {
  const r = buildPayload('email', { to: 'a@b.co', subject: 'Hi there', body: 'two\nlines' })
  assert.equal(r.text, 'mailto:a@b.co?subject=Hi%20there&body=two%0Alines')
  assert.equal(buildPayload('email', { to: 'not-an-email' }).errorKey, 'err.emailInvalid')
})

test('sms and tel payloads', () => {
  assert.equal(buildPayload('sms', { phone: '123 456', message: 'yo' }).text, 'SMSTO:123456:yo')
  assert.equal(buildPayload('tel', { phone: '+1 (555) 0100' }).text, 'tel:+15550100')
  assert.equal(buildPayload('tel', { phone: '' }).errorKey, 'err.phoneRequired')
})

test('geo: comma decimals accepted, ranges enforced, trailing zeros trimmed', () => {
  const r = buildPayload('geo', { lat: '48,8584', lng: '2.294500' })
  assert.equal(r.text, 'geo:48.8584,2.2945')
  assert.equal(buildPayload('geo', { lat: '91', lng: '0' }).errorKey, 'err.latRange')
  assert.equal(buildPayload('geo', { lat: '0', lng: '200' }).errorKey, 'err.lngRange')
})

test('whatsapp: wa.me link with optional prefilled text', () => {
  const r = buildPayload('whatsapp', { phone: '+49 170 123', message: 'Hello 👋' })
  assert.equal(r.text, 'https://wa.me/49170123?text=Hello%20%F0%9F%91%8B')
  const r2 = buildPayload('whatsapp', { phone: '49170123', message: '' })
  assert.equal(r2.text, 'https://wa.me/49170123')
})
