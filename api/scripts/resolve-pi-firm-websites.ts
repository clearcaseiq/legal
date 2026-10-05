/**
 * Resolve firm websites for staged PI attorneys that have none on file.
 *
 * Works only on `production_attorneys` (staging) rows from the bar roll that
 * list an explicit PI practice area. Sources, in order of confidence:
 *
 *   1. colleague   — another bar-roll row at the same firm already has a site.
 *   2. known-domain — the attorney's email domain is a site another row holds.
 *   3. places      — the firm matches a Google-Places-discovered location.
 *   4. email-domain — the attorney's own firm email domain, accepted only after
 *                     the site loads and names the firm or one of its attorneys.
 *
 * Insurer domains are never accepted, and a site that reads as insurance
 * defence is recorded as such: the bar's practice-area field names the area of
 * law, not the side, so "Personal Injury" includes defence counsel.
 *
 * Read-only unless --apply. Every decision is written to a CSV for review.
 *
 * Run:
 *   cd api
 *   npm run resolve:pi-websites -- --out ../pi-websites.csv
 *   npm run resolve:pi-websites -- --apply
 *
 * Flags:
 *   --apply            Write accepted websites to the staging rows.
 *   --include-defense  With --apply, also write sites classified as defence.
 *   --limit <n>        Only consider the first n attorneys (testing).
 *   --concurrency <n>  Parallel domain checks (default 10).
 *   --timeout <ms>     Per-request timeout (default 8000).
 *   --out <path>       CSV report path (default ./pi-website-resolution.csv).
 */

import fs from 'node:fs'
import path from 'node:path'
import '../src/env'
import { prisma } from '../src/lib/prisma'

type Args = {
  apply: boolean
  includeDefense: boolean
  limit: number | null
  concurrency: number
  timeoutMs: number
  out: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    apply: false, includeDefense: false, limit: null, concurrency: 10, timeoutMs: 8000,
    out: path.resolve('pi-website-resolution.csv'),
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = () => argv[++i]
    switch (flag) {
      case '--apply': args.apply = true; break
      case '--include-defense': args.includeDefense = true; break
      case '--limit': { const v = Number(next()); args.limit = Number.isFinite(v) ? Math.floor(v) : null; break }
      case '--concurrency': { const v = Number(next()); args.concurrency = Number.isFinite(v) && v > 0 ? Math.floor(v) : 10; break }
      case '--timeout': { const v = Number(next()); args.timeoutMs = Number.isFinite(v) && v > 0 ? Math.floor(v) : 8000; break }
      case '--out': args.out = path.resolve(next() ?? args.out); break
      default: if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }
  return args
}

const SOURCE = 'cpra-ca-bar-2026'
const EXPLICIT_PI = /personal injury|wrongful death|medical malpractice|motor vehicle|auto.*accident|premises/i

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'sbcglobal.net',
  'comcast.net', 'msn.com', 'att.net', 'me.com', 'live.com', 'ymail.com', 'earthlink.net', 'cox.net',
  'verizon.net', 'mac.com', 'pacbell.net', 'protonmail.com', 'proton.me', 'rocketmail.com', 'mail.com',
  'charter.net', 'juno.com', 'netzero.net', 'roadrunner.com', 'gmx.com', 'zoho.com', 'yahoo.co.uk',
  'googlemail.com', 'fastmail.com', 'hushmail.com', 'aim.com', 'frontier.com', 'frontiernet.net',
  // Shared vanity hosts: many unrelated attorneys, no firm behind the domain.
  'lawyer.com', 'attorney.com', 'counsel.com', 'usa.net', 'email.com', 'inbox.com',
])

/** Public employers: their attorneys don't take private PI referrals. */
const PUBLIC_EMPLOYER = /\b(county|city of|district attorney|public defender|state of california|attorney general|superior court|department of|city attorney)\b/i

/** Carriers and their in-house counsel: never a plaintiff firm's website. */
const INSURER_DOMAIN = /(insurance|statefarm|farmers|libertymutual|allstate|geico|progressive|travelers|nationwide|csaa|mercury|zurich|chubb|aig\.com|thehartford|usaa|kemper|wawanesa|amfam|safeco|esurance|infinityauto|metlife|aaa\.com|ace(ina|group)|cna\.com|berkley|markel|sedgwick|crawco|gallagherbassett)/i

const SKIP_DOMAIN = (d: string) =>
  !d || PERSONAL_DOMAINS.has(d) || /\.(gov|edu|mil|us)$/.test(d) || /gov\.org$/.test(d)

// Plaintiff sites routinely mention "defense counsel" or "insurance carriers"
// when describing the other side, so only phrases a defence firm uses about
// itself count here.
const DEFENSE_PHRASES = [
  'insurance defense', 'defense litigation', 'defend insurers', 'represent insurers',
  'representing insurers', 'defense of insurance', 'civil defense', 'defense of claims',
  'defending businesses', 'self-insured', 'third-party administrators', 'we represent employers',
  'claims professionals', 'risk managers', 'on behalf of insurers', 'defense of employers',
]
const PLAINTIFF_PHRASES = [
  'injury attorney', 'injury lawyer', 'accident attorney', 'accident lawyer', 'no fee unless',
  'no win no fee', 'no recovery no fee', 'free consultation', 'free case evaluation',
  'we fight for', 'injured', 'contingency',
]
const PARKED = /domain (is )?for sale|buy this domain|parked free|this domain may be for sale|godaddy\.com\/domainsearch|sedoparking|hugedomains|dan\.com/i

const GENERIC_FIRM_WORDS = new Set([
  'law', 'laws', 'office', 'offices', 'group', 'firm', 'attorney', 'attorneys', 'lawyer', 'lawyers',
  'legal', 'associates', 'partners', 'the', 'and', 'llp', 'llc', 'apc', 'inc', 'professional',
  'corporation', 'corp', 'counsel', 'injury', 'personal', 'accident', 'trial', 'california', 'center',
])

function normFirm(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(law\s+offices?\s+of|the|a\s+professional\s+(corporation|law\s+corporation)|llp|l\.l\.p\.|llc|l\.l\.c\.|lp|pc|p\.c\.|inc|pllc|apc|a\.p\.c\.|attorneys?\s+at\s+law|and|&)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '')
    .trim()
}

function firmTokens(name: string | null | undefined): string[] {
  if (!name) return []
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !GENERIC_FIRM_WORDS.has(w))
}

function surname(name: string): string {
  const parts = name.toLowerCase().replace(/[^a-z\s,-]/g, '').trim()
  // Bar roll names are usually "Last, First Middle".
  if (parts.includes(',')) return parts.split(',')[0].trim().split(/\s+/).pop() ?? ''
  return parts.split(/\s+/).pop() ?? ''
}

function domainOf(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url)
    return u.hostname.replace(/^www\./i, '').toLowerCase()
  } catch { return '' }
}

function emailDomain(email: string | null | undefined): string {
  const e = String(email || '').trim().toLowerCase()
  const at = e.lastIndexOf('@')
  return at > 0 ? e.slice(at + 1) : ''
}

async function fetchHtml(url: string, timeoutMs: number): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ClearCaseIQ-FirmSiteCheck/1.0)' },
    })
    if (!res.ok) return null
    if (!(res.headers.get('content-type') ?? '').includes('text/html')) return null
    const html = (await res.text()).slice(0, 300_000)
    return { html, finalUrl: res.url || url }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function pageText(html: string): string {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ''
  const body = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
  return `${title} ${body}`.replace(/&amp;/g, '&').replace(/\s+/g, ' ').toLowerCase()
}

type Side = 'plaintiff' | 'defense' | 'unclear'

/** Bios often say "began her career at an insurance defense firm"; that is history, not the firm's side. */
const CAREER_CONTEXT = /(former|formerly|previously|prior to|worked|working as|began|career|years (at|with|as|of)|followed by|before (joining|founding|starting|opening)|started (at|as|with)|spent)/

function hasCurrentPhrase(text: string, phrase: string): boolean {
  let from = 0
  for (;;) {
    const i = text.indexOf(phrase, from)
    if (i < 0) return false
    if (!CAREER_CONTEXT.test(text.slice(Math.max(0, i - 90), i))) return true
    from = i + phrase.length
  }
}

function classifySide(text: string): Side {
  const defense = DEFENSE_PHRASES.filter((p) => hasCurrentPhrase(text, p)).length
  const plaintiff = PLAINTIFF_PHRASES.filter((p) => text.includes(p)).length
  if (defense > 0 && plaintiff <= 1) return 'defense'
  if (plaintiff >= 2 && defense === 0) return 'plaintiff'
  return 'unclear'
}

type DomainCheck = {
  status: 'verified' | 'unverified' | 'unreachable' | 'parked' | 'insurer'
  website: string | null
  side: Side | ''
  evidence: string
}

async function checkDomain(
  domain: string,
  firmNames: string[],
  surnames: string[],
  timeoutMs: number,
): Promise<DomainCheck> {
  if (INSURER_DOMAIN.test(domain)) return { status: 'insurer', website: null, side: 'defense', evidence: 'insurer domain' }
  for (const url of [`https://${domain}`, `https://www.${domain}`, `http://www.${domain}`]) {
    const page = await fetchHtml(url, timeoutMs)
    if (!page) continue
    const text = pageText(page.html)
    if (PARKED.test(text) || text.length < 200) return { status: 'parked', website: null, side: '', evidence: 'parked or empty page' }
    const finalDomain = domainOf(page.finalUrl) || domain
    const redirected = !(finalDomain === domain || finalDomain.endsWith('.' + domain) || domain.endsWith('.' + finalDomain))
    const domains = `${domain} ${finalDomain}`.replace(/[^a-z]/g, '')
    // A lone firm-name word is weak (first names, place names), so it counts
    // only when it is also in the domain or a second firm word is on the page.
    const tokens = [...new Set(firmNames.flatMap(firmTokens))]
    const tokenHits = tokens.filter((t) => text.includes(t))
    const strongToken = tokenHits.find((t) => domains.includes(t)) ?? (tokenHits.length >= 2 ? tokenHits.join('+') : undefined)
    const surnameHit = surnames.find((s) => s.length >= 4 && text.includes(s))
    const website = `https://${finalDomain}`
    const via = redirected ? `, via redirect from ${domain}` : ''
    if (strongToken || surnameHit) {
      return {
        status: 'verified', website, side: classifySide(text),
        evidence: (strongToken ? `firm name "${strongToken}"` : `surname "${surnameHit}"`) + via,
      }
    }
    return { status: 'unverified', website, side: classifySide(text), evidence: 'page does not name firm or attorney' + via }
  }
  return { status: 'unreachable', website: null, side: '', evidence: 'no response' }
}

async function runPool<T>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<void>) {
  let index = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++
      await fn(items[i], i)
    }
  })
  await Promise.all(workers)
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

type Row = {
  id: string
  name: string
  firmName: string | null
  city: string | null
  email: string | null
  barNumber: string | null
}

type Decision = {
  method: 'colleague' | 'known-domain' | 'places' | 'email-domain' | 'none'
  status: string
  website: string | null
  side: Side | ''
  evidence: string
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log('\nResolve firm websites for staged PI attorneys')
  console.log(`  Mode: ${args.apply ? 'APPLY (writes to production_attorneys)' : 'report only'}`)
  console.log(`  Report: ${args.out}\n`)

  // Everything with a website on file seeds the colleague and known-domain lookups.
  const withSite = await prisma.productionAttorney.findMany({
    where: { source: SOURCE, website: { not: null } },
    select: { firmName: true, website: true },
  })
  const siteByFirm = new Map<string, string>()
  const siteByDomain = new Map<string, string>()
  for (const r of withSite) {
    const site = r.website?.trim()
    if (!site) continue
    const nf = normFirm(r.firmName)
    if (nf.length >= 5 && !siteByFirm.has(nf)) siteByFirm.set(nf, site)
    const d = domainOf(site)
    if (d && !siteByDomain.has(d)) siteByDomain.set(d, site)
  }

  const discovered: Array<{ cachedName: string | null; cachedWebsiteUri: string | null; websiteDomain: string | null }> =
    await (prisma as any).discoveredFirmLocation
      .findMany({ where: { websiteDomain: { not: null } }, select: { cachedName: true, cachedWebsiteUri: true, websiteDomain: true } })
      .catch(() => [])
  const placesByFirm = new Map<string, string>()
  const placesByDomain = new Map<string, string>()
  for (const f of discovered) {
    const d = (f.websiteDomain ?? '').toLowerCase()
    const site = f.cachedWebsiteUri || (d ? `https://${d}` : '')
    if (!site) continue
    const nf = normFirm(f.cachedName)
    if (nf.length >= 5 && !placesByFirm.has(nf)) placesByFirm.set(nf, site)
    if (d && !placesByDomain.has(d)) placesByDomain.set(d, site)
  }

  const candidates = (await prisma.productionAttorney.findMany({
    where: {
      source: SOURCE,
      status: { not: 'rejected' },
      OR: [{ website: null }, { website: '' }],
      practiceAreas: { not: null },
    },
    select: { id: true, name: true, firmName: true, city: true, email: true, barNumber: true, practiceAreas: true },
    orderBy: { id: 'asc' },
  })).filter((r) => EXPLICIT_PI.test(r.practiceAreas ?? ''))
  const rows: Row[] = args.limit ? candidates.slice(0, args.limit) : candidates
  console.log(`  Explicit-PI attorneys without a website: ${rows.length.toLocaleString()}`)
  console.log(`  Lookups: ${siteByFirm.size.toLocaleString()} firms, ${siteByDomain.size.toLocaleString()} domains on file; ${discovered.length} Places firms\n`)

  const decisions = new Map<string, Decision>()
  const pendingByDomain = new Map<string, Row[]>()

  for (const r of rows) {
    const nf = normFirm(r.firmName)
    const ed = emailDomain(r.email)
    const colleague = nf.length >= 5 ? siteByFirm.get(nf) : undefined
    const known = ed ? siteByDomain.get(ed) : undefined
    const places = (ed && placesByDomain.get(ed)) || (nf.length >= 5 ? placesByFirm.get(nf) : undefined)
    if (PUBLIC_EMPLOYER.test(r.firmName ?? '')) {
      decisions.set(r.id, { method: 'none', status: 'public-employer', website: null, side: '', evidence: 'government or court employer' })
    } else if (colleague) decisions.set(r.id, { method: 'colleague', status: 'accepted', website: colleague, side: '', evidence: 'same firm name' })
    else if (known && !INSURER_DOMAIN.test(ed)) decisions.set(r.id, { method: 'known-domain', status: 'accepted', website: known, side: '', evidence: `email domain ${ed}` })
    else if (places) decisions.set(r.id, { method: 'places', status: 'accepted', website: places, side: '', evidence: 'Google Places firm' })
    else if (!SKIP_DOMAIN(ed)) {
      const list = pendingByDomain.get(ed) ?? []
      list.push(r)
      pendingByDomain.set(ed, list)
    } else {
      decisions.set(r.id, {
        method: 'none', status: r.firmName ? 'firm-name-only' : 'nothing-to-go-on', website: null, side: '',
        evidence: ed ? `personal/government email (${ed})` : 'no email',
      })
    }
  }

  const domains = [...pendingByDomain.keys()]
  console.log(`  Checking ${domains.length.toLocaleString()} firm email domains (concurrency ${args.concurrency})...`)
  let done = 0
  const started = Date.now()
  await runPool(domains, args.concurrency, async (domain) => {
    const members = pendingByDomain.get(domain)!
    const check = await checkDomain(
      domain,
      [...new Set(members.map((m) => m.firmName).filter(Boolean) as string[])],
      [...new Set(members.map((m) => surname(m.name)).filter(Boolean))],
      args.timeoutMs,
    )
    for (const m of members) {
      decisions.set(m.id, { method: 'email-domain', status: check.status, website: check.website, side: check.side, evidence: check.evidence })
    }
    done += 1
    if (done % 200 === 0 || done === domains.length) {
      const secs = Math.round((Date.now() - started) / 1000)
      console.log(`    ${done.toLocaleString()}/${domains.length.toLocaleString()} domains (${secs}s)`)
    }
  })

  // Report
  const header = ['id', 'name', 'bar_number', 'firm_name', 'city', 'email', 'method', 'status', 'side', 'website', 'evidence']
  const lines = [header.join(',')]
  for (const r of rows) {
    const d = decisions.get(r.id)!
    lines.push([r.id, r.name, r.barNumber, r.firmName, r.city, r.email, d.method, d.status, d.side, d.website, d.evidence].map(csvCell).join(','))
  }
  fs.writeFileSync(args.out, lines.join('\n'), 'utf8')

  const count = (pred: (d: Decision) => boolean) => [...decisions.values()].filter(pred).length
  const accepted = (d: Decision) =>
    d.status === 'accepted' || (d.status === 'verified' && (d.side !== 'defense' || args.includeDefense))

  console.log(`\n${'═'.repeat(56)}`)
  console.log(`  Attorneys considered                 ${rows.length.toLocaleString()}`)
  console.log(`  From existing data`)
  console.log(`    same-firm colleague                ${count((d) => d.method === 'colleague').toLocaleString()}`)
  console.log(`    email domain already on file       ${count((d) => d.method === 'known-domain').toLocaleString()}`)
  console.log(`    Google Places firm                 ${count((d) => d.method === 'places').toLocaleString()}`)
  console.log(`  From firm email domain`)
  console.log(`    verified, plaintiff                ${count((d) => d.status === 'verified' && d.side === 'plaintiff').toLocaleString()}`)
  console.log(`    verified, side unclear             ${count((d) => d.status === 'verified' && d.side === 'unclear').toLocaleString()}`)
  console.log(`    verified, defence                  ${count((d) => d.status === 'verified' && d.side === 'defense').toLocaleString()}`)
  console.log(`    loads but does not name the firm   ${count((d) => d.status === 'unverified').toLocaleString()}`)
  console.log(`    parked / empty                     ${count((d) => d.status === 'parked').toLocaleString()}`)
  console.log(`    unreachable                        ${count((d) => d.status === 'unreachable').toLocaleString()}`)
  console.log(`    insurer (excluded)                 ${count((d) => d.status === 'insurer').toLocaleString()}`)
  console.log(`  Government / court employer (skipped) ${count((d) => d.status === 'public-employer').toLocaleString()}`)
  console.log(`  Still unresolved`)
  console.log(`    firm name only                     ${count((d) => d.status === 'firm-name-only').toLocaleString()}`)
  console.log(`    nothing to go on                   ${count((d) => d.status === 'nothing-to-go-on').toLocaleString()}`)
  console.log(`  ${args.apply ? 'Writing' : 'Would write'} websites for            ${count(accepted).toLocaleString()}`)
  console.log(`${'═'.repeat(56)}\n`)

  if (args.apply) {
    let written = 0
    for (const [id, d] of decisions) {
      if (!accepted(d) || !d.website) continue
      await prisma.productionAttorney.update({ where: { id }, data: { website: d.website } })
      written += 1
    }
    console.log(`  Wrote ${written.toLocaleString()} websites.\n`)
  }

  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
