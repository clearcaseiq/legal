/**
 * Records the attorney dashboard overview video (8 chapters, ~4 min) against
 * the real app and the local API + database, using the seeded demo attorney.
 *
 *   pnpm video:attorney-overview
 *
 * Needs the API on :4000 (`pnpm --filter caseiq-api dev`) with demo data
 * (`pnpm --filter caseiq-api seed:salman-cases`). Starts its own recording
 * Vite server on :5174 unless one is already running.
 *
 * Writes app/public/videos/attorney-guides-overview.{mp4,vtt,jpg}. The run is
 * view-only: every non-GET API request is aborted before it leaves the browser.
 *
 * Env: VIDEO_ATTORNEY_EMAIL, ATTORNEY_PASSWORD, VIDEO_API_URL, VIDEO_WEB_PORT,
 * FFMPEG_PATH, VIDEO_SKIP_WARMUP=1.
 */
import { chromium, type Page } from '@playwright/test'
import { spawn, spawnSync, type ChildProcess } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createPrisma, pickDemoCases, resolveSession, type AttorneySession } from './session'

const ROOT = path.resolve(__dirname, '../..')
const OUT_DIR = path.join(ROOT, 'app', 'public', 'videos')
const BASENAME = 'attorney-guides-overview'
const WEB_PORT = Number(process.env.VIDEO_WEB_PORT || 5174)
const BASE = `http://localhost:${WEB_PORT}`
const API_URL = process.env.VIDEO_API_URL || 'http://localhost:4000'
const EMAIL = process.env.VIDEO_ATTORNEY_EMAIL || 'salman@salmanlawfirm.com'
const VIEWPORT = { width: 1600, height: 900 }
/** Scales every shot's hold; this sets the final length since loads are cut out. */
const PACE = 0.9

type Shot = {
  url: string
  caption: string
  /** Seconds to hold after the page settles (split around the scroll, if any). */
  hold: number
  /** Pixels to scroll smoothly partway through the hold. */
  scroll?: number
  /** Visible text of an element to outline while holding. */
  highlight?: string
}

type Chapter = { title: string; blurb: string; shots: Shot[] }

function buildChapters(activeId: string, pendingId: string | null): Chapter[] {
  const c = (section: string, query = '') => `/attorney-dashboard/cases/${activeId}/${section}${query}`
  const matches = '/attorney-dashboard/leadgen/matches'
  return [
    {
      title: 'Getting started',
      blurb: 'Your dashboard, profile and firm in one place.',
      shots: [
        { url: matches, caption: 'Sign in and the sidebar splits Lead Generation from Case Management.', hold: 7 },
        { url: '/attorney-profile', caption: 'Keep your profile, practice areas and service area current: they drive routing.', hold: 7, scroll: 420 },
        { url: '/firm-dashboard?tab=team', caption: 'Firm admins manage attorneys, staff and roles from the firm dashboard.', hold: 7 },
      ],
    },
    {
      title: 'Receiving and accepting cases',
      blurb: 'Review routed matches before you decide.',
      shots: [
        { url: matches, caption: 'New matches arrive here with value, strength and a countdown to respond.', hold: 8, scroll: 360 },
        ...(pendingId
          ? [
              {
                url: `${matches}/${pendingId}/overview`,
                caption: 'Open a match for a read-only review: incident, treatment, insurance and evidence.',
                hold: 10,
                scroll: 380,
              },
              {
                url: `${matches}/${pendingId}/overview`,
                caption: 'Accept or decline when you are ready. Accepting charges the routing fee.',
                hold: 6,
                highlight: 'Accept Case',
              },
            ]
          : []),
        { url: '/attorney-dashboard/cases/active', caption: 'Accepted matches move to Active Cases with a next action for each.', hold: 8, scroll: 260 },
      ],
    },
    {
      title: 'The case workspace',
      blurb: 'Everything about a matter, grouped into tabs.',
      shots: [
        { url: c('overview'), caption: 'Each case opens on a summary: value, policy limits, demand and days open.', hold: 9, scroll: 420 },
        { url: c('client-info'), caption: 'Client info keeps contact details and parties in one place.', hold: 6, scroll: 300 },
        { url: c('timeline'), caption: 'Activity is a running timeline of everything that happened on the case.', hold: 6 },
        { url: c('medical'), caption: 'Medical, Claim and Documents tabs hold the evidence behind the case.', hold: 6, scroll: 300 },
      ],
    },
    {
      title: 'Tasks and workflows',
      blurb: 'Know what is next on every matter.',
      shots: [
        { url: c('tasks'), caption: 'The case Tasks queue lists recommended next steps and open items.', hold: 8, scroll: 380 },
        { url: c('workflow'), caption: 'Workflow shows the case moving through phases and stages.', hold: 7, scroll: 300 },
        { url: '/attorney-dashboard/cases/tasks', caption: 'The Tasks hub rolls up every case so nothing slips.', hold: 7, scroll: 300 },
        { url: '/firm-dashboard?tab=workflow', caption: 'Firm admins define the standard workflow new matters follow.', hold: 7, scroll: 300 },
      ],
    },
    {
      title: 'Client communication',
      blurb: 'Messages, mentions and contact details.',
      shots: [
        { url: '/attorney-dashboard/cases/messages', caption: 'Messages collects client and adjuster threads across every case.', hold: 7 },
        { url: '/attorney-dashboard/cases/messages?tab=team', caption: 'Team and Mentions tabs keep internal conversation separate.', hold: 6 },
        { url: c('overview'), caption: 'From any case, Message client opens the conversation for that matter.', hold: 6, highlight: 'Message client' },
      ],
    },
    {
      title: 'E-signatures and firm templates',
      blurb: 'Retainers and authorizations, signed electronically.',
      shots: [
        { url: c('documents', '?view=signatures'), caption: 'Signatures tracks the retainer and HIPAA authorization for each case.', hold: 8, scroll: 300 },
        { url: '/attorney-dashboard/cases/documents', caption: 'Documents & E-sign shows outstanding requests and signatures firm-wide.', hold: 7, scroll: 300 },
        { url: '/firm-dashboard?tab=templates', caption: 'Firm templates store reusable retainers, HIPAA forms and intake packages.', hold: 7 },
      ],
    },
    {
      title: 'Demand, negotiation and settlement',
      blurb: 'The Resolution tab carries the case to close.',
      shots: [
        { url: c('demand'), caption: 'Demand checks readiness and assembles specials, liability and damages.', hold: 9, scroll: 420 },
        { url: c('negotiation'), caption: 'Negotiation logs offers and counteroffers against your demand.', hold: 7, scroll: 300 },
        { url: c('settlement'), caption: 'Settlement records the outcome, disbursement and closing steps.', hold: 7, scroll: 300 },
      ],
    },
    {
      title: 'Billing, time and invoices',
      blurb: 'Track time, invoices and your platform billing.',
      shots: [
        { url: c('time'), caption: 'Log team hours on each case for profitability and fee petitions.', hold: 7, scroll: 260 },
        { url: c('billing'), caption: 'Invoices tracks client invoices and payments for the case.', hold: 7, scroll: 260 },
        { url: '/attorney-dashboard/cases/billing', caption: 'The Billing hub rolls up fees collected across every case.', hold: 7, scroll: 260 },
        { url: '/firm-dashboard?tab=time', caption: 'Firm Time & Billing sets billing rates and reviews time entries.', hold: 6 },
        { url: '/attorney-billing', caption: 'Attorney billing covers your plan, payment method and routing fees.', hold: 6, scroll: 260 },
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
// Overlay: chapter cards, lower-third captions, highlight ring and a veil that
// hides loading states between views. Lives outside #root so React leaves it.

const OVERLAY_CSS = `
#vo-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:Inter,system-ui,sans-serif}
#vo-veil{position:absolute;inset:0;background:#f4f7fb;opacity:0;transition:opacity .35s ease}
#vo-card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 160px;
  background:linear-gradient(135deg,rgba(15,30,61,.94),rgba(22,52,104,.90));color:#fff;opacity:0;transition:opacity .5s ease;backdrop-filter:blur(6px)}
#vo-card .k{font-size:20px;letter-spacing:.18em;text-transform:uppercase;color:#f5a524;font-weight:600}
#vo-card .t{font-family:Fraunces,Georgia,serif;font-size:68px;line-height:1.08;margin-top:18px;max-width:1100px}
#vo-card .b{font-size:26px;color:#cdd8ea;margin-top:22px}
#vo-card .p{display:flex;gap:10px;margin-top:48px}
#vo-card .p i{width:56px;height:6px;border-radius:3px;background:rgba(255,255,255,.22)}
#vo-card .p i.on{background:#f5a524}
#vo-lt{position:absolute;left:40px;bottom:36px;max-width:1040px;display:flex;align-items:stretch;border-radius:14px;overflow:hidden;
  box-shadow:0 12px 32px rgba(15,30,61,.28);opacity:0;transform:translateY(16px);transition:opacity .45s ease,transform .45s ease}
#vo-lt.on{opacity:1;transform:none}
#vo-lt .n{background:#f5a524;color:#0f1e3d;font-weight:700;font-size:22px;padding:0 20px;display:flex;align-items:center}
#vo-lt .x{background:rgba(15,30,61,.95);color:#fff;padding:14px 24px}
#vo-lt .h{font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:#f5c66b;font-weight:600}
#vo-lt .c{font-size:23px;line-height:1.3;margin-top:4px;transition:opacity .25s ease}
#vo-hl{position:absolute;border:3px solid #f5a524;border-radius:12px;box-shadow:0 0 0 6px rgba(245,165,36,.25);opacity:0;transition:opacity .3s ease}
#vo-hl.on{opacity:1;animation:vo-pulse 1.4s ease-in-out infinite}
@keyframes vo-pulse{50%{box-shadow:0 0 0 14px rgba(245,165,36,.08)}}
`

async function ensureOverlay(page: Page) {
  for (let attempt = 0; ; attempt++) {
    try {
      await injectOverlay(page)
      return
    } catch (err) {
      if (attempt >= 5) throw err
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      await page.waitForTimeout(1000)
    }
  }
}

async function injectOverlay(page: Page) {
  await page.evaluate((css) => {
    if (document.getElementById('vo-root')) return
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    const root = document.createElement('div')
    root.id = 'vo-root'
    root.innerHTML = `<div id="vo-hl"></div><div id="vo-lt"><div class="n"></div><div class="x"><div class="h"></div><div class="c"></div></div></div>
      <div id="vo-veil"></div><div id="vo-card"><div class="k"></div><div class="t"></div><div class="b"></div><div class="p"></div></div>`
    document.documentElement.appendChild(root)
  }, OVERLAY_CSS)
}

async function setVeil(page: Page, on: boolean) {
  await page.evaluate((on) => {
    document.getElementById('vo-veil')!.style.opacity = on ? '1' : '0'
  }, on)
  await page.waitForTimeout(400)
}

async function showCard(page: Page, kicker: string, title: string, blurb: string, index: number, total: number) {
  await page.evaluate(
    ({ kicker, title, blurb, index, total }) => {
      const card = document.getElementById('vo-card')!
      card.querySelector('.k')!.textContent = kicker
      card.querySelector('.t')!.textContent = title
      card.querySelector('.b')!.textContent = blurb
      card.querySelector('.p')!.innerHTML =
        index < 0 ? '' : Array.from({ length: total }, (_, i) => `<i class="${i <= index ? 'on' : ''}"></i>`).join('')
      card.style.opacity = '1'
    },
    { kicker, title, blurb, index, total },
  )
  await page.waitForTimeout(500)
}

async function hideCard(page: Page) {
  await page.evaluate(() => {
    document.getElementById('vo-card')!.style.opacity = '0'
  })
  await page.waitForTimeout(500)
}

async function setLowerThird(page: Page, num: string, heading: string, caption: string | null) {
  await page.evaluate(
    ({ num, heading, caption }) => {
      const lt = document.getElementById('vo-lt')!
      if (caption === null) {
        lt.classList.remove('on')
        return
      }
      lt.querySelector('.n')!.textContent = num
      lt.querySelector('.h')!.textContent = heading
      lt.querySelector('.c')!.textContent = caption
      lt.classList.add('on')
    },
    { num, heading, caption },
  )
}

async function setHighlight(page: Page, text: string | null) {
  let box: { x: number; y: number; width: number; height: number } | null = null
  if (text) {
    const loc = page.getByText(text, { exact: true }).first()
    box = await loc.boundingBox({ timeout: 2000 }).catch(() => null)
    if (box && (box.y < 0 || box.y + box.height > VIEWPORT.height)) {
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      box = await loc.boundingBox({ timeout: 2000 }).catch(() => null)
    }
  }
  await page.evaluate((box) => {
    const hl = document.getElementById('vo-hl')!
    if (!box) {
      hl.classList.remove('on')
      return
    }
    const pad = 8
    Object.assign(hl.style, {
      left: `${box.x - pad}px`,
      top: `${box.y - pad}px`,
      width: `${box.width + pad * 2}px`,
      height: `${box.height + pad * 2}px`,
    })
    hl.classList.add('on')
  }, box)
}

// Kept as a string: tsx wraps named inner functions in a `__name` helper that
// does not exist in the page.
const SMOOTH_SCROLL_JS = `(({ dy, ms }) => new Promise((resolve) => {
  const start = window.scrollY
  const footer = document.querySelector('footer')
  const footerTop = footer ? footer.getBoundingClientRect().top + window.scrollY : Infinity
  const max = Math.min(document.documentElement.scrollHeight, footerTop + 40) - window.innerHeight
  const target = dy < 0 ? Math.max(0, start + dy) : Math.max(start, Math.min(max, start + dy))
  const t0 = performance.now()
  function step(now) {
    const p = Math.min(1, (now - t0) / ms)
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
    window.scrollTo(0, start + (target - start) * e)
    if (p < 1) requestAnimationFrame(step)
    else resolve()
  }
  requestAnimationFrame(step)
}))`

async function smoothScroll(page: Page, dy: number, ms = 1600) {
  await page.evaluate(`${SMOOTH_SCROLL_JS}(${JSON.stringify({ dy, ms })})`)
}

// ---------------------------------------------------------------------------
// Navigation: client-side route changes keep the overlay mounted and avoid
// full reloads of the dev bundle. Waits for API traffic to go quiet.

function trackNetwork(page: Page) {
  let inflight = 0
  let lastChange = Date.now()
  const counts = (url: string) => url.includes('/v1/') || url.includes('/uploads/')
  page.on('request', (r) => {
    if (counts(r.url())) {
      inflight++
      lastChange = Date.now()
    }
  })
  const done = (r: { url(): string }) => {
    if (counts(r.url())) {
      inflight = Math.max(0, inflight - 1)
      lastChange = Date.now()
    }
  }
  page.on('requestfinished', done)
  page.on('requestfailed', done)
  return async (quietMs = 700, maxMs = 12000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < maxMs) {
      if (inflight === 0 && Date.now() - lastChange >= quietMs) return
      await page.waitForTimeout(100)
    }
  }
}

async function routeTo(page: Page, url: string, settle: () => Promise<void>) {
  const current = await page.evaluate(() => location.pathname + location.search)
  if (current !== url) {
    await page.evaluate((url) => {
      window.history.pushState({}, '', url)
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
    }, url)
  }
  await page.waitForTimeout(300)
  await settle()
  await ensureOverlay(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
}

// ---------------------------------------------------------------------------

async function isUp(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    return res.status < 500
  } catch {
    return false
  }
}

async function startWebServer(): Promise<ChildProcess | null> {
  if (await isUp(BASE)) return null
  const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(process.execPath, [vite, '--config', path.join(__dirname, 'vite.video.config.ts')], {
    cwd: path.join(ROOT, 'app'),
    env: { ...process.env, VIDEO_API_URL: process.env.VIDEO_API_URL || 'http://127.0.0.1:4000' },
    stdio: 'ignore',
  })
  for (let i = 0; i < 60; i++) {
    if (await isUp(BASE)) return child
    await new Promise((r) => setTimeout(r, 1000))
  }
  child.kill()
  throw new Error(`Recording web server did not start on ${BASE}`)
}

function findFfmpeg(): string | null {
  const candidates = [process.env.FFMPEG_PATH, 'ffmpeg']
  try {
    candidates.push(require('ffmpeg-static'))
  } catch {}
  candidates.push('C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe')
  for (const c of candidates) {
    if (!c) continue
    const r = spawnSync(c, ['-hide_banner', '-encoders'], { encoding: 'utf8' })
    if (r.status === 0 && r.stdout.includes('libx264')) return c
  }
  return null
}

function vttTime(s: number) {
  const ms = Math.max(0, Math.round(s * 1000))
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(ms % 1000, 3)}`
}

async function primeSession(page: Page, session: AttorneySession) {
  await page.goto(`${BASE}/attorney-login`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((s) => {
    localStorage.setItem('auth_token', s.token)
    localStorage.setItem('user', JSON.stringify(s.user))
    localStorage.setItem('attorney', JSON.stringify(s.attorney))
    localStorage.setItem('auth_role', 'attorney')
  }, session)
}

async function main() {
  if (!(await isUp(`${API_URL}/health`))) {
    throw new Error(`API not reachable at ${API_URL}. Start it with: pnpm --filter caseiq-api dev`)
  }
  const prisma = createPrisma()
  const session = await resolveSession(prisma, EMAIL)
  const cases = await pickDemoCases(prisma, String(session.attorney.id))
  await prisma.$disconnect()
  if (!cases.activeLeadId) throw new Error(`${EMAIL} has no active case. Seed with: pnpm --filter caseiq-api seed:salman-cases`)
  console.log('Demo cases:', cases)

  const chapters = buildChapters(cases.activeLeadId, cases.pendingLeadId)
  const server = await startWebServer()
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'attorney-video-'))
  const browser = await chromium.launch()
  const blocked: string[] = []

  const viewOnly = async (ctx: import('@playwright/test').BrowserContext) => {
    await ctx.route(/\/(v1|uploads)\//, (route) => {
      const req = route.request()
      if (req.method() === 'GET' || req.method() === 'HEAD' || req.method() === 'OPTIONS') return route.continue()
      blocked.push(`${req.method()} ${new URL(req.url()).pathname}`)
      return route.fulfill({ status: 204, body: '' })
    })
  }

  try {
    if (!process.env.VIDEO_SKIP_WARMUP) {
      console.log('Warming up views...')
      const warm = await browser.newContext({ viewport: VIEWPORT })
      await viewOnly(warm)
      const page = await warm.newPage()
      await primeSession(page, session)
      const urls = [...new Set(chapters.flatMap((ch) => ch.shots.map((s) => s.url)))]
      for (const u of urls) {
        await page.goto(BASE + u, { waitUntil: 'domcontentloaded' }).catch(() => {})
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
      }
      await warm.close()
    }

    console.log('Recording...')
    const ctx = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: tmp, size: VIEWPORT } })
    await viewOnly(ctx)
    const page = await ctx.newPage()
    const videoT0 = Date.now()
    const now = () => (Date.now() - videoT0) / 1000
    const settle = trackNetwork(page)
    page.on('pageerror', (e) => console.log('  page error:', e.message.slice(0, 160)))

    await primeSession(page, session)
    await page.goto(BASE + chapters[0].shots[0].url, { waitUntil: 'domcontentloaded' })
    await settle(1000, 20000)
    await page.waitForTimeout(1500)
    await ensureOverlay(page)
    await showCard(page, 'ClearCaseIQ for attorneys', 'Attorney dashboard overview', 'A guided tour in eight chapters.', -1, 0)
    await page.waitForTimeout(500)

    // Times below are seconds into the raw recording. Page loads happen behind
    // the veil or a chapter card and are cut out at encode time, so the final
    // length does not depend on how fast the machine renders.
    const introStart = now()
    const cuts: [number, number][] = []
    const behindCover = async (work: () => Promise<void>) => {
      const from = now()
      await work()
      const to = now()
      if (to - from > 0.3) cuts.push([from + 0.1, to - 0.1])
    }
    type Cue = { start: number; end: number; text: string }
    const cues: Cue[] = []
    const chapterStarts: { title: string; start: number }[] = []
    let posterAt = 0
    const cue = (text: string) => {
      if (cues.length) cues[cues.length - 1].end = now()
      cues.push({ start: now(), end: 0, text })
    }

    cue('Attorney dashboard overview: a guided tour in eight chapters.')
    await page.waitForTimeout(4500)

    for (const [ci, ch] of chapters.entries()) {
      const num = String(ci + 1).padStart(2, '0')
      chapterStarts.push({ title: ch.title, start: now() })
      await setLowerThird(page, '', '', null)
      await setHighlight(page, null)
      await showCard(page, `Chapter ${ci + 1} of ${chapters.length}`, ch.title, ch.blurb, ci, chapters.length)
      cue(`Chapter ${ci + 1}: ${ch.title}. ${ch.blurb}`)
      await behindCover(() => routeTo(page, ch.shots[0].url, () => settle()))
      await page.waitForTimeout(2200)

      for (const [si, shot] of ch.shots.entries()) {
        if (si > 0) {
          const prev = ch.shots[si - 1]
          await setHighlight(page, null)
          if (prev.url !== shot.url) {
            await setVeil(page, true)
            await behindCover(async () => {
              await routeTo(page, shot.url, () => settle())
              await setLowerThird(page, num, ch.title, shot.caption)
            })
            await setVeil(page, false)
          } else {
            await smoothScroll(page, -10000, 900)
            await setLowerThird(page, num, ch.title, shot.caption)
          }
        } else {
          await setLowerThird(page, num, ch.title, shot.caption)
          await hideCard(page)
        }
        cue(shot.caption)
        if (ci === 2 && si === 0) posterAt = now() + 2
        if (shot.highlight) await setHighlight(page, shot.highlight)
        const holdMs = shot.hold * PACE * 1000
        if (shot.scroll) {
          await page.waitForTimeout(holdMs * 0.4)
          await smoothScroll(page, shot.scroll)
          await page.waitForTimeout(Math.max(0, holdMs * 0.6 - 1600))
        } else {
          await page.waitForTimeout(holdMs)
        }
      }
    }

    await setHighlight(page, null)
    await setLowerThird(page, '', '', null)
    await showCard(page, 'That is the tour', 'Step-by-step attorney guides', 'Each chapter has a written guide with steps and tips under Help > Guides.', -1, 0)
    cue('That is the tour. Each chapter has a written guide with steps and tips under Help > Guides.')
    await page.waitForTimeout(4500)
    const rawEnd = now()
    cues[cues.length - 1].end = rawEnd

    const video = page.video()!
    await ctx.close()
    const webm = await video.path()

    /** Maps a raw recording time to the edited video's timeline. */
    const toOut = (t: number) =>
      t - introStart - cuts.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(b, t) - a), 0)
    const end = toOut(rawEnd)

    fs.mkdirSync(OUT_DIR, { recursive: true })
    const vtt = [
      'WEBVTT',
      '',
      ...cues.flatMap((c, i) => [String(i + 1), `${vttTime(toOut(c.start))} --> ${vttTime(toOut(c.end))}`, c.text, '']),
    ].join('\n')
    fs.writeFileSync(path.join(OUT_DIR, `${BASENAME}.vtt`), vtt)

    const ffmpeg = findFfmpeg()
    const mp4 = path.join(OUT_DIR, `${BASENAME}.mp4`)
    const jpg = path.join(OUT_DIR, `${BASENAME}.jpg`)
    if (ffmpeg) {
      const between = ([a, b]: [number, number]) => `between(t\\,${a.toFixed(2)}\\,${b.toFixed(2)})`
      const keep = `${between([introStart, rawEnd])}*not(${cuts.map(between).join('+') || '0'})`
      const enc = spawnSync(
        ffmpeg,
        ['-y', '-hide_banner', '-loglevel', 'error', '-i', webm, '-vf', `select=${keep},setpts=N/25/TB`,
          '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p', '-r', '25', '-movflags', '+faststart', '-an', mp4],
        { stdio: 'inherit' },
      )
      if (enc.status !== 0) throw new Error('ffmpeg encode failed')
      const poster = spawnSync(
        ffmpeg,
        ['-y', '-hide_banner', '-loglevel', 'error', '-ss', toOut(posterAt).toFixed(2), '-i', mp4, '-frames:v', '1', '-update', '1', '-q:v', '3', jpg],
        { stdio: 'inherit' },
      )
      if (poster.status !== 0) console.warn('Poster extraction failed')
    } else {
      const out = path.join(OUT_DIR, `${BASENAME}.webm`)
      fs.copyFileSync(webm, out)
      console.warn(`No H.264-capable ffmpeg found (set FFMPEG_PATH). Kept untrimmed WebM: ${out} (trim ${introStart.toFixed(2)}s)`)
    }

    console.log(`\nDuration: ${end.toFixed(1)}s (cut ${(rawEnd - introStart - end).toFixed(1)}s of loading)`)
    console.log('Chapters:')
    for (const c of chapterStarts) console.log(`  ${vttTime(toOut(c.start)).slice(3, 8)}  ${c.title}`)
    if (blocked.length) console.log(`Blocked ${blocked.length} write request(s):`, [...new Set(blocked)].join(', '))
    console.log(`Wrote ${OUT_DIR}`)
  } finally {
    await browser.close().catch(() => {})
    server?.kill()
    try {
      fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
    } catch {
      console.warn(`Could not remove temp recording dir ${tmp}; delete it manually.`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
