#!/usr/bin/env node
/* CDP smoke test: drives the built app over the DevTools protocol and prints
 * DOM facts as text (no screenshots). Usage: node scripts/smoke-cdp.mjs <port> */
const port = process.argv[2] ?? '9222'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getPageWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const targets = await res.json()
      const page = targets.find((t) => t.type === 'page' && !/devtools/i.test(t.url))
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(500)
  }
  throw new Error('no page target found')
}

const ws = new WebSocket(await getPageWs())
let id = 0
const pending = new Map()

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id
    pending.set(mid, { resolve, reject })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
}

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
  }
}

ws.onopen = async () => {
  try {
    await send('Runtime.enable')
    await sleep(1500) // let boot() finish

    async function evalJs(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) throw new Error('page eval failed: ' + JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text))
      return r.result?.value
    }

    const results = {}

    results.buttons = await evalJs(
      `[...document.querySelectorAll('#export-row .btn')].map(b => b.textContent.trim())`
    )

    // open the batch modal
    await evalJs(`document.querySelectorAll('#export-row .btn')[2].click()`)
    await sleep(200)
    results.modalOpen = await evalJs(`!!document.querySelector('.batch-overlay')`)
    results.modalTitle = await evalJs(`document.querySelector('.batch-title')?.textContent?.trim()`)

    // type a batch list and read the summary
    await evalJs(`(() => {
      const ta = document.querySelector('.batch-input');
      ta.value = "https://example.com\\nmenu,https://cafe.example.com/menu\\nshop,\\"https://shop.example.com/?a=1,b=2\\"\\n# comment\\n";
      ta.dispatchEvent(new Event('input'));
    })()`)
    await sleep(150)
    results.summary = await evalJs(`document.querySelector('.batch-summary')?.textContent?.trim()`)

    // an invalid line should flip the summary
    await evalJs(`(() => {
      const ta = document.querySelector('.batch-input');
      ta.value = "a,https://x.example.com,broken,extra";
      ta.dispatchEvent(new Event('input'));
    })()`)
    await sleep(100)
    results.summaryBad = await evalJs(`document.querySelector('.batch-summary')?.textContent?.trim()`)

    // restore valid input, check generate button is enabled
    await evalJs(`(() => {
      const ta = document.querySelector('.batch-input');
      ta.value = "https://example.com\\nsecond,https://example.org";
      ta.dispatchEvent(new Event('input'));
    })()`)
    await sleep(100)
    results.generateEnabled = await evalJs(
      `!document.querySelector('.batch-dialog .btn.primary').disabled`
    )

    // escape closes
    await evalJs(`document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}))`)
    await sleep(100)
    results.modalClosedByEscape = await evalJs(`!document.querySelector('.batch-overlay')`)

    // preview renders after typing content (fresh profile starts empty by design)
    await evalJs(`(() => {
      const input = document.querySelector('#content-form input, #content-form textarea');
      input.value = 'https://example.com';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`)
    await sleep(700)
    results.previewReady = await evalJs(`document.querySelector('#status-msg')?.textContent?.includes('✓')`)

    console.log(JSON.stringify(results, null, 2))
    const ok =
      results.modalOpen === true &&
      results.modalClosedByEscape === true &&
      results.generateEnabled === true &&
      /3 codes ready/.test(results.summary ?? '') &&
      results.previewReady === true
    console.log(ok ? 'SMOKE-OK' : 'SMOKE-FAIL')
    process.exitCode = ok ? 0 : 1
  } catch (err) {
    console.error('SMOKE-ERROR:', err.message)
    process.exitCode = 1
  } finally {
    ws.close()
    setTimeout(() => process.exit(process.exitCode ?? 0), 100)
  }
}

ws.onerror = (e) => {
  console.error('WS-ERROR', e.message ?? e)
  process.exitCode = 1
}
