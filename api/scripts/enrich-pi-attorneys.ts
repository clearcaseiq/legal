/**
 * Enrich staged PI attorneys by scraping their firm websites.
 *
 * Two modes:
 *   1a. Re-scrape PI attorneys who already have a website URL (but missing bio/headshot)
 *   1b. Guess website URLs from firm names, then scrape for enrichment data
 *
 * Extracts: bio, headshot, professional email, languages, case results,
 * awards, free consultation, contingency fee, bar associations, social links.
 *
 * Run:
 *   cd api
 *   npx --package=tsx tsx scripts/enrich-pi-attorneys.ts --dry-run --limit 50
 *   npx --package=tsx tsx scripts/enrich-pi-attorneys.ts --limit 5000
 *   npx --package=tsx tsx scripts/enrich-pi-attorneys.ts
 *
 * Flags:
 *   --dry-run          Report without writing.
 *   --limit <n>        Process at most n attorneys.
 *   --concurrency <n>  Max parallel fetches (default: 8).
 *   --start-after <id> Resume from a specific attorney ID (cursor).
 *   --rescrape         Also re-scrape attorneys who already have websites.
 *   --save-progress    Print cursor ID every 500 records for manual resume.
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'

/* ── Reuse extraction functions from the existing enrichment script ───── */

const PI_KEYWORDS = [
  'personal injury', 'car accident', 'auto accident', 'truck accident',
  'motorcycle accident', 'pedestrian accident', 'bicycle accident',
  'slip and fall', 'premises liability', 'dog bite', 'animal attack',
  'wrongful death', 'medical malpractice', 'birth injury',
  'product liability', 'defective product', 'brain injury',
  'spinal cord injury', 'catastrophic injury', 'nursing home abuse',
  'elder abuse', 'construction accident', 'workplace injury',
  'workers compensation', 'insurance claim', 'uninsured motorist',
  'underinsured', 'bodily injury', 'pain and suffering',
  'no win no fee', 'no recovery no fee', 'free consultation',
  'injury attorney', 'injury lawyer', 'accident attorney', 'accident lawyer',
  'tort', 'negligence', 'settlement', 'compensation',
  'rideshare accident', 'uber accident', 'lyft accident',
  'hit and run', 'drunk driving accident', 'dui accident',
]

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'live.com', 'msn.com',
  'ymail.com', 'comcast.net', 'att.net', 'sbcglobal.net', 'verizon.net',
])

const KNOWN_LANGUAGES = [
  'spanish', 'mandarin', 'cantonese', 'chinese', 'korean', 'vietnamese',
  'tagalog', 'filipino', 'armenian', 'farsi', 'persian', 'arabic',
  'hindi', 'urdu', 'punjabi', 'russian', 'japanese', 'french',
  'german', 'portuguese', 'italian', 'polish', 'hebrew', 'thai',
  'cambodian', 'khmer', 'laotian', 'hmong', 'samoan', 'tongan',
]

const AWARD_PATTERNS = [
  /super\s+lawyers?/gi, /best\s+lawyers?\s+in\s+america/gi,
  /avvo\s+(?:rating|superb|top)/gi, /martindale[\s-]+hubbell/gi,
  /rising\s+star/gi, /top\s+(?:\d+|ten|hundred)\s+(?:attorneys?|lawyers?)/gi,
  /national\s+trial\s+lawyers?/gi, /million\s+dollar\s+advocates?\s+forum/gi,
  /board\s+certified/gi, /american\s+association\s+for\s+justice/gi,
  /consumer\s+attorneys?\s+(?:association|of)/gi, /lawyer\s+of\s+(?:the\s+)?year/gi,
]

const ASSOCIATION_PATTERNS = [
  /consumer\s+attorneys?\s+association\s+of\s+los\s+angeles/gi, /CAALA/g,
  /american\s+association\s+for\s+justice/gi, /AAJ/g,
  /american\s+bar\s+association/gi, /ABA/g,
  /california\s+lawyers?\s+association/gi,
  /los\s+angeles\s+county\s+bar\s+association/gi, /LACBA/g,
  /san\s+francisco\s+(?:trial\s+lawyers?|bar)\s+association/gi,
  /orange\s+county\s+(?:trial\s+lawyers?|bar)\s+association/gi,
  /national\s+trial\s+lawyers/gi,
]

/* ── Utility functions ─────────────────────────────────────────────── */

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 60000)
}

async function fetchPageText(url: string, timeoutMs = 10000): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CaseIQ-PI-Enrichment/0.2)' },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html')) return null
    return (await res.text()).slice(0, 200000)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function firmNameVariants(firmName: string): string[] {
  if (!firmName) return []
  const cleaned = firmName
    .toLowerCase()
    .replace(/\b(law\s+offices?\s+of|the|llp|llc|lp|pc|p\.c\.|l\.l\.p\.|inc|pllc|apc|a\.p\.c\.)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
  if (cleaned.length < 3) return []
  const slug = cleaned.replace(/\s+/g, '')
  const dashed = cleaned.replace(/\s+/g, '-')
  return [
    `https://${slug}law.com`,
    `https://www.${slug}law.com`,
    `https://${slug}.com`,
    `https://www.${slug}.com`,
    `https://${dashed}.com`,
  ]
}

function extractProfessionalEmails(html: string): string[] {
  const allEmails = new Set<string>()
  const mailtoRe = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi
  const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  let m: RegExpExecArray | null
  while ((m = mailtoRe.exec(html)) !== null) allEmails.add(m[1].toLowerCase())
  const text = stripHtml(html)
  while ((m = emailRe.exec(text)) !== null) allEmails.add(m[0].toLowerCase())
  return Array.from(allEmails).filter((email) => {
    const domain = email.split('@')[1]
    if (FREE_EMAIL_DOMAINS.has(domain)) return false
    if (/noreply|no-reply|donotreply|info@|support@|admin@|webmaster@|sales@/i.test(email)) return false
    if (/\.(png|jpg|gif|svg|css|js)$/i.test(email)) return false
    return true
  })
}

function extractHeadshot(html: string, baseUrl: string): string | null {
  const patterns = [
    /<img[^>]+(?:class|id)="[^"]*(?:attorney|lawyer|partner|headshot|portrait|profile|team|staff|photo)[^"]*"[^>]*src="([^"]+)"/gi,
    /<img[^>]+src="([^"]+)"[^>]*(?:class|id)="[^"]*(?:attorney|lawyer|partner|headshot|portrait|profile|team|staff|photo)[^"]*"/gi,
    /<img[^>]+alt="[^"]*(?:attorney|lawyer|partner|headshot|portrait|photo)[^"]*"[^>]*src="([^"]+)"/gi,
    /<img[^>]+src="([^"]+)"[^>]*alt="[^"]*(?:attorney|lawyer|partner|headshot|portrait|photo)[^"]*"/gi,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(html)
    if (match?.[1]) {
      let src = match[1]
      if (src.startsWith('//')) src = 'https:' + src
      else if (src.startsWith('/')) {
        try { src = new URL(src, baseUrl).href } catch { continue }
      }
      if (/\.(jpg|jpeg|png|webp)/i.test(src)) return src
    }
  }
  return null
}

function extractBio(text: string, attorneyName: string): string | null {
  const nameParts = attorneyName.toLowerCase().split(/\s+/)
  const lastName = nameParts[nameParts.length - 1]
  const patterns = [
    /(?:about|biography|bio|profile|background|meet)\s*[:\-—]?\s*(.{100,800})/i,
    new RegExp(`${lastName}[^.]*(?:has been|has over|is a|practices|represents|handles|specializes|dedicated|experienced|brings)[^.]*\\.(?:[^.]*\\.){0,4}`, 'i'),
    new RegExp(`(?:attorney|lawyer|counsel)\\s+${lastName}[^.]*\\.(?:[^.]*\\.){0,3}`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      const bio = (match[1] ?? match[0]).trim()
      if (bio.length >= 50 && bio.length <= 1000) return bio
    }
  }
  return null
}

function extractLanguages(text: string): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()
  if (lower.includes('se habla español') || lower.includes('se habla espanol')) found.add('Spanish')
  if (lower.includes('hablamos español') || lower.includes('hablamos espanol')) found.add('Spanish')
  for (const lang of KNOWN_LANGUAGES) {
    if (lower.includes(lang)) {
      const idx = lower.indexOf(lang)
      const nearby = lower.slice(Math.max(0, idx - 80), idx + lang.length + 80)
      if (/speak|fluent|bilingual|language|interpreter|translat|habla/i.test(nearby)) {
        found.add(lang.charAt(0).toUpperCase() + lang.slice(1))
      }
    }
  }
  return [...found]
}

function extractCaseResults(text: string): { amount: string; description: string }[] {
  const results: { amount: string; description: string }[] = []
  const pat1 = /\$[\d,]+(?:\.\d{1,2})?\s*(?:million|m|billion|b|thousand|k)?\b[^.]*(?:settlement|verdict|recovery|award|judgment|won|recovered|obtained|secured)[^.]*\./gi
  const pat2 = /(?:settlement|verdict|recovery|award|judgment|won|recovered|obtained|secured)[^.]*\$[\d,]+(?:\.\d{1,2})?\s*(?:million|m|billion|b|thousand|k)?[^.]*/gi
  let m: RegExpExecArray | null
  while ((m = pat1.exec(text)) !== null && results.length < 10) {
    const clean = m[0].trim().slice(0, 200)
    if (clean.length > 20) results.push({ amount: extractAmount(clean), description: clean })
  }
  while ((m = pat2.exec(text)) !== null && results.length < 10) {
    const clean = m[0].trim().slice(0, 200)
    if (clean.length > 20 && !results.some((r) => r.description === clean)) {
      results.push({ amount: extractAmount(clean), description: clean })
    }
  }
  return results
}

function extractAmount(text: string): string {
  const match = /\$([\d,]+(?:\.\d{1,2})?)\s*(million|m|billion|b|thousand|k)?/i.exec(text)
  return match ? '$' + match[1] + (match[2] ? ' ' + match[2] : '') : ''
}

function extractAwards(text: string): string[] {
  const awards = new Set<string>()
  for (const pattern of AWARD_PATTERNS) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) awards.add(m[0].trim())
  }
  return [...awards]
}

function extractAssociations(text: string): string[] {
  const assocs = new Set<string>()
  for (const pattern of ASSOCIATION_PATTERNS) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(text)) !== null) assocs.add(m[0].trim())
  }
  return [...assocs]
}

function extractSocialLinks(html: string): Record<string, string> {
  const links: Record<string, string> = {}
  const re = /href="(https?:\/\/(?:www\.)?(?:linkedin|facebook|twitter|x|instagram|youtube|avvo|justia|yelp)[^"]*)"[^>]*/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const url = m[1]
    if (url.includes('linkedin.com')) links.linkedin = url
    else if (url.includes('facebook.com')) links.facebook = url
    else if (url.includes('twitter.com') || url.includes('x.com')) links.twitter = url
    else if (url.includes('instagram.com')) links.instagram = url
    else if (url.includes('avvo.com')) links.avvo = url
    else if (url.includes('yelp.com')) links.yelp = url
  }
  return links
}

function detectFreeConsult(text: string): boolean {
  return /free\s+(?:consultation|case\s+(?:evaluation|review|assessment))/i.test(text) ||
    /no[\s-]+(?:fee|cost|charge|obligation)\s+(?:consultation|initial)/i.test(text)
}

function extractContingencyFee(text: string): string | null {
  const match = /(\d{2,3})%?\s*(?:contingency|attorney'?s?\s+fee|no\s+(?:win|recovery),?\s+no\s+fee)/i.exec(text)
  if (match) return match[1] + '%'
  if (/no\s+(?:win|recovery),?\s+no\s+fee/i.test(text)) return 'Contingency'
  return null
}

/* ── Batch concurrency ────────────────────────────────────────────── */

async function processInParallel<T, R>(
  items: T[], concurrency: number, fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let index = 0
  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

/* ── Args ─────────────────────────────────────────────────────────── */

type Args = {
  dryRun: boolean
  limit: number | null
  concurrency: number
  startAfter: string | null
  rescrape: boolean
  saveProgress: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, limit: null, concurrency: 8, startAfter: null, rescrape: false, saveProgress: true }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i], next = () => argv[++i]
    switch (flag) {
      case '--dry-run': args.dryRun = true; break
      case '--limit': { const v = Number(next()); args.limit = Number.isFinite(v) ? Math.floor(v) : null; break }
      case '--concurrency': { const v = Number(next()); args.concurrency = Number.isFinite(v) ? v : 8; break }
      case '--start-after': args.startAfter = next() ?? null; break
      case '--rescrape': args.rescrape = true; break
      case '--save-progress': args.saveProgress = true; break
      default: if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }
  return args
}

/* ── Main ─────────────────────────────────────────────────────────── */

const PAGE_SIZE = 200

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const startTime = Date.now()

  console.log('\n═══════════════════════════════════════════════════')
  console.log('  PI Attorney Website Enrichment')
  console.log('═══════════════════════════════════════════════════')
  if (args.dryRun) console.log('  MODE: DRY RUN')
  console.log(`  Concurrency: ${args.concurrency}`)
  if (args.limit) console.log(`  Limit: ${args.limit}`)
  if (args.startAfter) console.log(`  Resuming after: ${args.startAfter}`)
  console.log()

  const stats = {
    scanned: 0, withFirm: 0, noFirm: 0, urlsAttempted: 0, urlsReachable: 0,
    emailsFound: 0, headshotsFound: 0, biosFound: 0, languagesFound: 0,
    caseResultsFound: 0, awardsFound: 0, websitesFound: 0, updated: 0,
  }

  let cursor: string | undefined = args.startAfter || undefined
  let processed = 0

  for (;;) {
    const batch = await prisma.productionAttorney.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      where: {
        piRelevant: true,
        ...(args.rescrape ? {} : { bio: null }),
      },
      select: {
        id: true, name: true, firmName: true, website: true,
        email: true, bio: true, headshotUrl: true, languages: true,
        practiceAreas: true, caseResults: true, awards: true,
        socialLinks: true,
      },
    })

    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    await processInParallel(batch, args.concurrency, async (atty) => {
      stats.scanned++
      processed++

      // Determine which URLs to try
      let urlsToTry: string[] = []
      if (atty.website) {
        urlsToTry = [atty.website]
      } else if (atty.firmName) {
        stats.withFirm++
        urlsToTry = firmNameVariants(atty.firmName)
      } else {
        stats.noFirm++
        return
      }

      if (urlsToTry.length === 0) return

      for (const url of urlsToTry) {
        stats.urlsAttempted++
        const html = await fetchPageText(url)
        if (!html) continue

        stats.urlsReachable++
        const text = stripHtml(html)

        const profEmails = extractProfessionalEmails(html)
        const headshot = extractHeadshot(html, url)
        const bio = extractBio(text, atty.name)
        const languages = extractLanguages(text)
        const caseResults = extractCaseResults(text)
        const awards = extractAwards(text)
        const freeConsult = detectFreeConsult(text)
        const contingencyFee = extractContingencyFee(text)
        const associations = extractAssociations(text)
        const socialLinks = extractSocialLinks(html)

        const hasNewEmail = profEmails.length > 0 && !atty.email
        if (hasNewEmail) stats.emailsFound++
        if (headshot && !atty.headshotUrl) stats.headshotsFound++
        if (bio && !atty.bio) stats.biosFound++
        if (languages.length > 0 && !atty.languages) stats.languagesFound++
        if (caseResults.length > 0 && !atty.caseResults) stats.caseResultsFound++
        if (awards.length > 0 && !atty.awards) stats.awardsFound++
        if (!atty.website) stats.websitesFound++

        const updateData: Record<string, unknown> = {}
        if (!atty.website) updateData.website = url
        if (hasNewEmail) updateData.email = profEmails[0]
        if (headshot && !atty.headshotUrl) updateData.headshotUrl = headshot
        if (bio && !atty.bio) updateData.bio = bio
        if (languages.length > 0 && !atty.languages) updateData.languages = JSON.stringify(languages)
        if (caseResults.length > 0 && !atty.caseResults) updateData.caseResults = JSON.stringify(caseResults)
        if (awards.length > 0 && !atty.awards) updateData.awards = JSON.stringify(awards)
        if (freeConsult) updateData.freeConsult = true
        if (contingencyFee) updateData.contingencyFee = contingencyFee
        if (associations.length > 0) updateData.associations = JSON.stringify(associations)
        if (Object.keys(socialLinks).length > 0) {
          const existing = atty.socialLinks ? JSON.parse(atty.socialLinks) : {}
          updateData.socialLinks = JSON.stringify({ ...existing, ...socialLinks })
        }

        // Merge practice areas from PI keywords found on the site
        const matched = PI_KEYWORDS.filter((kw) => text.toLowerCase().includes(kw))
        if (matched.length > 0) {
          const existing: string[] = atty.practiceAreas ? JSON.parse(atty.practiceAreas) : []
          const merged = [...new Set([...existing, ...matched.slice(0, 8)])]
          if (merged.length > existing.length) updateData.practiceAreas = JSON.stringify(merged)
        }

        if (Object.keys(updateData).length > 0) {
          if (bio) console.log(`  ✓ ${atty.name} — +bio${headshot ? ' +photo' : ''}${hasNewEmail ? ' +email' : ''}${languages.length > 0 ? ' +langs' : ''} [${url}]`)
          else if (headshot || hasNewEmail) console.log(`  ✓ ${atty.name} —${headshot ? ' +photo' : ''}${hasNewEmail ? ' +email' : ''} [${url}]`)

          if (!args.dryRun) {
            await prisma.productionAttorney.update({ where: { id: atty.id }, data: updateData })
            stats.updated++
          }
        }

        break // Stop once we found a reachable site
      }
    })

    // Progress log every 500
    if (args.saveProgress && processed % 500 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rate = (processed / ((Date.now() - startTime) / 1000)).toFixed(1)
      console.log(`\n  ── ${processed.toLocaleString()} scanned | ${stats.updated} updated | ${stats.biosFound} bios | ${stats.headshotsFound} photos | ${rate}/s | ${elapsed}s | cursor: ${cursor} ──\n`)
    }

    if (args.limit && processed >= args.limit) break
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\n${'═'.repeat(55)}`)
  console.log(`  ${args.dryRun ? 'DRY RUN' : 'ENRICHMENT'} COMPLETE (${elapsed}s)`)
  console.log(`${'═'.repeat(55)}\n`)
  console.log(`  Scanned:              ${stats.scanned.toLocaleString()}`)
  console.log(`  With firm name:       ${stats.withFirm.toLocaleString()}`)
  console.log(`  No firm name:         ${stats.noFirm.toLocaleString()}`)
  console.log(`  URLs attempted:       ${stats.urlsAttempted.toLocaleString()}`)
  console.log(`  URLs reachable:       ${stats.urlsReachable.toLocaleString()}`)
  console.log()
  console.log('  Enrichment found:')
  console.log(`    Websites:           ${stats.websitesFound.toLocaleString()}`)
  console.log(`    Bios:               ${stats.biosFound.toLocaleString()}`)
  console.log(`    Headshots:          ${stats.headshotsFound.toLocaleString()}`)
  console.log(`    Professional emails: ${stats.emailsFound.toLocaleString()}`)
  console.log(`    Languages:          ${stats.languagesFound.toLocaleString()}`)
  console.log(`    Case results:       ${stats.caseResultsFound.toLocaleString()}`)
  console.log(`    Awards:             ${stats.awardsFound.toLocaleString()}`)
  if (!args.dryRun) console.log(`\n  Rows updated:         ${stats.updated.toLocaleString()}`)
  if (cursor) console.log(`\n  Last cursor:          ${cursor}`)
  console.log(`  Resume with:          --start-after ${cursor}\n`)

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
