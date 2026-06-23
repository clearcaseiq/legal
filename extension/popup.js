/**
 * ClearCaseIQ → CMS popup logic.
 *
 * Phase 4 browser extension: an in-context surface that lets attorneys/staff
 * push the case they're looking at into their connected CMS without leaving
 * their workflow. It authenticates against the ClearCaseIQ API and reuses the
 * same /v1/integrations endpoints as the web app — no DOM scraping.
 */
const DEFAULT_API_BASE = 'http://localhost:4000'

const $ = (id) => document.getElementById(id)

function setStatus(kind, text) {
  const el = $('status')
  el.className = `status ${kind === 'ok' ? 'ok' : 'err'}`
  el.textContent = text
}

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiBase', 'token'], (v) =>
      resolve({ apiBase: v.apiBase || DEFAULT_API_BASE, token: v.token || '' })
    )
  })
}

async function saveConfig(apiBase, token) {
  return new Promise((resolve) => chrome.storage.local.set({ apiBase, token }, resolve))
}

async function apiFetch(path, options = {}) {
  const { apiBase, token } = await getConfig()
  const res = await fetch(`${apiBase.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json()).error || ''
    } catch {}
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return res.json()
}

/** Pull an assessment id out of a ClearCaseIQ tab URL if present. */
function detectAssessmentId(url) {
  if (!url) return ''
  const patterns = [/\/results\/([a-z0-9]+)/i, /\/lead\/([a-z0-9]+)/i, /assessmentId=([a-z0-9]+)/i]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return ''
}

async function loadConnections() {
  const select = $('connection')
  try {
    const { connections } = await apiFetch('/v1/integrations/connections')
    select.innerHTML = '<option value="">All connected CMS</option>'
    for (const c of connections.filter((x) => x.status === 'connected')) {
      const opt = document.createElement('option')
      opt.value = c.id
      opt.textContent = `${c.provider}${c.externalAccountEmail ? ` (${c.externalAccountEmail})` : ''}`
      select.appendChild(opt)
    }
  } catch (e) {
    setStatus('err', e.message)
  }
}

async function init() {
  const { apiBase, token } = await getConfig()
  $('apiBase').value = apiBase
  $('token').value = token

  // Auto-detect the case id from the active tab.
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const detected = detectAssessmentId(tab && tab.url)
    if (detected) $('assessmentId').value = detected
  } catch {}

  if (!token) $('settings').open = true
  await loadConnections()
}

$('saveBtn').addEventListener('click', async () => {
  await saveConfig($('apiBase').value.trim(), $('token').value.trim())
  setStatus('ok', 'Saved.')
  await loadConnections()
})

$('testBtn').addEventListener('click', loadConnections)

$('pushBtn').addEventListener('click', async () => {
  const assessmentId = $('assessmentId').value.trim()
  if (!assessmentId) {
    setStatus('err', 'Enter a case (assessment) ID.')
    return
  }
  const connectionId = $('connection').value || undefined
  $('pushBtn').disabled = true
  setStatus('ok', 'Pushing…')
  try {
    const data = await apiFetch('/v1/integrations/export', {
      method: 'POST',
      body: JSON.stringify({ assessmentId, connectionId }),
    })
    const results = data.results || []
    const ok = results.filter((r) => !r.error).length
    const errs = results.filter((r) => r.error)
    if (errs.length) {
      setStatus('err', `Sent to ${ok}, failed ${errs.length}: ${errs[0].error}`)
    } else {
      const docs = results.reduce((n, r) => n + (r.documents ? r.documents.length : 0), 0)
      setStatus('ok', `Exported to ${ok} CMS · ${docs} document(s).`)
    }
  } catch (e) {
    setStatus('err', e.message)
  } finally {
    $('pushBtn').disabled = false
  }
})

init()
