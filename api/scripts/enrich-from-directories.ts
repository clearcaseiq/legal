/**
 * Enrich staged PI attorneys by looking them up on free legal directories
 * using their California bar number.
 *
 * Sources (in priority order):
 *   1. California State Bar website — public profile with status, address, discipline
 *   2. Avvo.com — bio, headshot, ratings, practice areas, languages
 *   3. Justia.com — bio, website, practice areas, education
 *
 * Run:
 *   cd api
 *   npx --package=tsx tsx scripts/enrich-from-directories.ts --dry-run --limit 50
 *   npx --package=tsx tsx scripts/enrich-from-directories.ts --limit 5000
 *   npx --package=tsx tsx scripts/enrich-from-directories.ts
 *
 * Flags:
 *   --dry-run        Report without writing.
 *   --limit <n>      Process at most n attorneys.
 *   --concurrency    Max parallel fetches (default: 3).
 *   --source <s>     Filter by source (default: cpra-ca-bar-2026).
 *   --skip-enriched  Skip attorneys that already have a bio (default: true).
 *   --avvo-only      Only query Avvo.
 *   --justia-only    Only query Justia.
 *   --calbar-only    Only query California State Bar.
 *   --start-after <id>  Resume from a specific attorney ID (cursor).
 */

import '../src/env'
import { prisma } from '../src/lib/prisma'

type Args = {
  dryRun: boolean
  limit: number | null
  source: string
  concurrency: number
  skipEnriched: boolean
  sources: ('avvo' | 'justia' | 'calbar')[]
  startAfter: string | null
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    limit: null,
    source: 'cpra-ca-bar-2026',
    concurrency: 3,
    skipEnriched: true,
    sources: ['avvo', 'justia', 'calbar'],
    startAfter: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = () => argv[++i]
    switch (flag) {
      case '--dry-run': args.dryRun = true; break
      case '--limit': { const v = Number(next()); args.limit = Number.isFinite(v) ? Math.floor(v) : null; break }
      case '--source': args.source = next() ?? args.source; break
      case '--concurrency': { const v = Number(next()); args.concurrency = Number.isFinite(v) ? v : 3; break }
      case '--skip-enriched': args.skipEnriched = true; break
      case '--include-enriched': args.skipEnriched = false; break
      case '--avvo-only': args.sources = ['avvo']; break
      case '--justia-only': args.sources = ['justia']; break
      case '--calbar-only': args.sources = ['calbar']; break
      case '--start-after': args.startAfter = next() ?? null; break
      default: if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`)
    }
  }
  return args
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchText(url: string, timeoutMs = 12000): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: HEADERS,
      redirect: 'follow',
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80000)
}

// ── Avvo.com enrichment ────────────────────────────────────────────────

interface AvvoData {
  bio: string | null
  headshotUrl: string | null
  rating: number | null
  reviewCount: number | null
  languages: string[]
  practiceAreas: string[]
  website: string | null
  avvoUrl: string
}

async function lookupAvvo(barNumber: string, name: string, state: string): Promise<AvvoData | null> {
  // Avvo has a structured URL pattern for California attorneys
  // Try search page first
  const nameParts = name.toLowerCase().split(/\s+/).filter(Boolean)
  if (nameParts.length < 2) return null
  const firstName = nameParts[0]
  const lastName = nameParts[nameParts.length - 1]

  const searchUrl = `https://www.avvo.com/attorneys/${state.toLowerCase()}/${firstName}-${lastName}.html`
  const html = await fetchText(searchUrl)
  if (!html) return null

  // Check if the page contains this bar number to confirm identity
  if (!html.includes(barNumber)) {
    // Try the search results page
    const searchUrl2 = `https://www.avvo.com/search/lawyer_search?q=${encodeURIComponent(name)}&loc=${encodeURIComponent(state)}`
    const html2 = await fetchText(searchUrl2)
    if (!html2 || !html2.includes(barNumber)) return null
    // Extract the profile URL from search results
    const profileMatch = /href="(https?:\/\/www\.avvo\.com\/attorneys\/[^"]+)"[^>]*>/.exec(html2)
    if (!profileMatch) return null
    const profileHtml = await fetchText(profileMatch[1])
    if (!profileHtml || !profileHtml.includes(barNumber)) return null
    return parseAvvoProfile(profileHtml, profileMatch[1])
  }

  return parseAvvoProfile(html, searchUrl)
}

function parseAvvoProfile(html: string, url: string): AvvoData {
  const text = stripHtml(html)
  const data: AvvoData = {
    bio: null,
    headshotUrl: null,
    rating: null,
    reviewCount: null,
    languages: [],
    practiceAreas: [],
    website: null,
    avvoUrl: url,
  }

  // Extract headshot
  const imgMatch = /<img[^>]+src="([^"]+)"[^>]*class="[^"]*(?:headshot|avatar|photo|profile)[^"]*"/i.exec(html)
    || /<img[^>]+class="[^"]*(?:headshot|avatar|photo|profile)[^"]*"[^>]*src="([^"]+)"/i.exec(html)
  if (imgMatch) {
    const src = imgMatch[1] || imgMatch[2]
    if (src && /\.(jpg|jpeg|png|webp)/i.test(src)) {
      data.headshotUrl = src.startsWith('//') ? 'https:' + src : src
    }
  }

  // Extract bio from JSON-LD or page text
  const bioMatch = /(?:"description"\s*:\s*"([^"]{50,800})")/i.exec(html)
  if (bioMatch) data.bio = bioMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim()
  if (!data.bio) {
    const aboutMatch = /(?:about|biography|bio)\s*[:\-—]?\s*(.{80,600})/i.exec(text)
    if (aboutMatch) data.bio = aboutMatch[1].trim()
  }

  // Extract rating
  const ratingMatch = /"ratingValue"\s*:\s*"?(\d+(?:\.\d+)?)"?/i.exec(html)
  if (ratingMatch) data.rating = parseFloat(ratingMatch[1])

  const reviewMatch = /"reviewCount"\s*:\s*"?(\d+)"?/i.exec(html)
  if (reviewMatch) data.reviewCount = parseInt(reviewMatch[1])

  // Extract practice areas
  const paRegex = /practice[- ]?areas?[^<]*<[^>]*>([\s\S]*?)(?:<\/(?:ul|div|section)>)/gi
  const paMatch = paRegex.exec(html)
  if (paMatch) {
    const liRegex = /<li[^>]*>([^<]+)</gi
    let li: RegExpExecArray | null
    while ((li = liRegex.exec(paMatch[1])) !== null) {
      const area = li[1].trim()
      if (area.length > 2 && area.length < 80) data.practiceAreas.push(area)
    }
  }

  // Extract languages
  const langMatch = /(?:languages?|speaks?)\s*[:\-]?\s*([^<]{5,100})/i.exec(text)
  if (langMatch) {
    const langs = langMatch[1].split(/[,;]/).map((l) => l.trim()).filter((l) => l.length > 2 && l.length < 30)
    data.languages = langs
  }

  // Extract website
  const websiteMatch = /href="(https?:\/\/(?!www\.avvo\.com)[^"]+)"[^>]*>\s*(?:website|visit|firm)/i.exec(html)
  if (websiteMatch) data.website = websiteMatch[1]

  return data
}

// ── Justia.com enrichment ──────────────────────────────────────────────

interface JustiaData {
  bio: string | null
  website: string | null
  practiceAreas: string[]
  education: string | null
  justiaUrl: string
  headshotUrl: string | null
}

async function lookupJustia(barNumber: string, name: string): Promise<JustiaData | null> {
  const nameParts = name.toLowerCase().split(/\s+/).filter(Boolean)
  if (nameParts.length < 2) return null
  const firstName = nameParts[0]
  const lastName = nameParts[nameParts.length - 1]

  // Justia profile URL pattern
  const profileUrl = `https://www.justia.com/lawyers/${firstName}-${lastName}-${barNumber}`
  const html = await fetchText(profileUrl)
  if (!html) {
    // Try search
    const searchUrl = `https://www.justia.com/lawyers/search?q=${encodeURIComponent(name)}&state=california`
    const searchHtml = await fetchText(searchUrl)
    if (!searchHtml) return null

    const linkMatch = /href="(https?:\/\/www\.justia\.com\/lawyers\/[^"]+)"/.exec(searchHtml)
    if (!linkMatch) return null

    const profileHtml = await fetchText(linkMatch[1])
    if (!profileHtml) return null
    return parseJustiaProfile(profileHtml, linkMatch[1])
  }

  return parseJustiaProfile(html, profileUrl)
}

function parseJustiaProfile(html: string, url: string): JustiaData {
  const text = stripHtml(html)
  const data: JustiaData = {
    bio: null,
    website: null,
    practiceAreas: [],
    education: null,
    justiaUrl: url,
    headshotUrl: null,
  }

  // Bio
  const bioMatch = /(?:"description"\s*:\s*"([^"]{50,800})")/i.exec(html)
  if (bioMatch) data.bio = bioMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim()
  if (!data.bio) {
    const aboutMatch = /(?:about|biography|profile)\s*[:\-—]?\s*(.{80,600})/i.exec(text)
    if (aboutMatch) data.bio = aboutMatch[1].trim()
  }

  // Website
  const wsMatch = /href="(https?:\/\/(?!www\.justia\.com)[^"]+)"[^>]*>\s*(?:website|visit|firm website)/i.exec(html)
  if (wsMatch) data.website = wsMatch[1]

  // Headshot
  const imgMatch = /<img[^>]+src="([^"]+)"[^>]*(?:class|alt)="[^"]*(?:lawyer|attorney|photo|profile|headshot)[^"]*"/i.exec(html)
    || /<img[^>]+(?:class|alt)="[^"]*(?:lawyer|attorney|photo|profile|headshot)[^"]*"[^>]*src="([^"]+)"/i.exec(html)
  if (imgMatch) {
    const src = imgMatch[1] || imgMatch[2]
    if (src && /\.(jpg|jpeg|png|webp)/i.test(src)) {
      data.headshotUrl = src.startsWith('//') ? 'https:' + src : src
    }
  }

  // Practice areas
  const paSection = /practice\s*areas?[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i.exec(html)
  if (paSection) {
    const liRegex = /<li[^>]*>([^<]+)</gi
    let li: RegExpExecArray | null
    while ((li = liRegex.exec(paSection[1])) !== null) {
      const area = li[1].trim()
      if (area.length > 2 && area.length < 80) data.practiceAreas.push(area)
    }
  }

  // Education
  const eduMatch = /(?:education|law school|j\.d\.|juris doctor)[^<]*([^<]{10,200})/i.exec(text)
  if (eduMatch) data.education = eduMatch[1].trim()

  return data
}

// ── California State Bar lookup ────────────────────────────────────────

interface CalBarData {
  status: string | null
  address: { city: string; state: string; zip: string } | null
  admissionDate: string | null
  sections: string[]
}

async function lookupCalBar(barNumber: string): Promise<CalBarData | null> {
  const url = `https://apps.calbar.ca.gov/attorney/Licensee/Detail/${barNumber}`
  const html = await fetchText(url)
  if (!html || html.includes('No records found') || html.includes('We could not find')) return null

  const text = stripHtml(html)
  const data: CalBarData = {
    status: null,
    address: null,
    admissionDate: null,
    sections: [],
  }

  // Status
  const statusMatch = /(?:status|license status)\s*[:\-]?\s*(active|inactive|suspended|disbarred|resigned|deceased)/i.exec(text)
  if (statusMatch) data.status = statusMatch[1]

  // City/State/Zip
  const addrMatch = /(?:address|city)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\s*(\d{5})/i.exec(text)
  if (addrMatch) {
    data.address = { city: addrMatch[1], state: addrMatch[2], zip: addrMatch[3] }
  }

  // Admission date
  const dateMatch = /(?:date\s+admitted|admission\s+date|admitted)\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(text)
  if (dateMatch) data.admissionDate = dateMatch[1]

  // CLA sections
  const sectionMatch = /(?:sections?\s*[:\-]?\s*)([\s\S]{10,300}?)(?:\n\n|<\/)/i.exec(text)
  if (sectionMatch) {
    data.sections = sectionMatch[1].split(/[,;\n]/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 80)
  }

  return data
}

// ── Batch processing ───────────────────────────────────────────────────

async function processInParallel<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let index = 0
  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

// ── Main ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 100

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log('\n═══════════════════════════════════════════════════')
  console.log('  Directory Enrichment Pipeline')
  console.log('═══════════════════════════════════════════════════')
  console.log(`  Sources:     ${args.sources.join(', ')}`)
  console.log(`  Concurrency: ${args.concurrency}`)
  console.log(`  Dry run:     ${args.dryRun}`)
  if (args.limit) console.log(`  Limit:       ${args.limit}`)
  if (args.startAfter) console.log(`  Start after: ${args.startAfter}`)
  console.log()

  const stats = {
    scanned: 0,
    skipped: 0,
    avvoHits: 0,
    justiaHits: 0,
    calbarHits: 0,
    biosFound: 0,
    headshotsFound: 0,
    websitesFound: 0,
    ratingsFound: 0,
    languagesFound: 0,
    practiceAreasFound: 0,
    updated: 0,
    errors: 0,
  }

  let cursor: string | undefined = args.startAfter || undefined
  let processed = 0

  for (;;) {
    const batch = await prisma.productionAttorney.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      where: {
        source: args.source,
        piRelevant: true,
        barNumber: { not: null },
        barState: 'CA',
        ...(args.skipEnriched ? { bio: null } : {}),
      },
      select: {
        id: true,
        name: true,
        barNumber: true,
        barState: true,
        state: true,
        website: true,
        email: true,
        bio: true,
        headshotUrl: true,
        rating: true,
        reviewCount: true,
        languages: true,
        practiceAreas: true,
        awards: true,
        caseResults: true,
        socialLinks: true,
      },
    })

    if (batch.length === 0) break
    cursor = batch[batch.length - 1].id

    await processInParallel(batch, args.concurrency, async (atty, batchIdx) => {
      stats.scanned++
      processed++
      const barNum = atty.barNumber!
      const updateData: Record<string, unknown> = {}

      try {
        // ── Avvo lookup ──
        if (args.sources.includes('avvo') && !atty.bio) {
          await sleep(1500 + Math.random() * 1000) // polite delay
          const avvo = await lookupAvvo(barNum, atty.name, atty.state || 'CA')
          if (avvo) {
            stats.avvoHits++
            if (avvo.bio && !atty.bio) { updateData.bio = avvo.bio; stats.biosFound++ }
            if (avvo.headshotUrl && !atty.headshotUrl) { updateData.headshotUrl = avvo.headshotUrl; stats.headshotsFound++ }
            if (avvo.website && !atty.website) { updateData.website = avvo.website; stats.websitesFound++ }
            if (avvo.rating && !atty.rating) { updateData.rating = avvo.rating; stats.ratingsFound++ }
            if (avvo.reviewCount && !atty.reviewCount) updateData.reviewCount = avvo.reviewCount
            if (avvo.languages.length > 0 && !atty.languages) {
              updateData.languages = JSON.stringify(avvo.languages)
              stats.languagesFound++
            }
            if (avvo.practiceAreas.length > 0) {
              const existing: string[] = atty.practiceAreas ? JSON.parse(atty.practiceAreas) : []
              const merged = [...new Set([...existing, ...avvo.practiceAreas])]
              if (merged.length > existing.length) {
                updateData.practiceAreas = JSON.stringify(merged)
                stats.practiceAreasFound++
              }
            }
            const existingSocial: Record<string, string> = atty.socialLinks ? JSON.parse(atty.socialLinks) : {}
            existingSocial.avvo = avvo.avvoUrl
            updateData.socialLinks = JSON.stringify(existingSocial)

            console.log(`  [${processed}] AVVO ✓ ${atty.name}${avvo.bio ? ' +bio' : ''}${avvo.headshotUrl ? ' +photo' : ''}${avvo.rating ? ` +${avvo.rating}★` : ''}`)
          }
        }

        // ── Justia lookup ──
        if (args.sources.includes('justia') && !updateData.bio && !atty.bio) {
          await sleep(1500 + Math.random() * 1000)
          const justia = await lookupJustia(barNum, atty.name)
          if (justia) {
            stats.justiaHits++
            if (justia.bio && !atty.bio && !updateData.bio) { updateData.bio = justia.bio; stats.biosFound++ }
            if (justia.headshotUrl && !atty.headshotUrl && !updateData.headshotUrl) { updateData.headshotUrl = justia.headshotUrl; stats.headshotsFound++ }
            if (justia.website && !atty.website && !updateData.website) { updateData.website = justia.website; stats.websitesFound++ }
            if (justia.practiceAreas.length > 0) {
              const existing: string[] = atty.practiceAreas ? JSON.parse(atty.practiceAreas) : []
              const allMerged = updateData.practiceAreas ? JSON.parse(updateData.practiceAreas as string) : existing
              const merged = [...new Set([...allMerged, ...justia.practiceAreas])]
              if (merged.length > allMerged.length) {
                updateData.practiceAreas = JSON.stringify(merged)
                stats.practiceAreasFound++
              }
            }
            const existingSocial: Record<string, string> = updateData.socialLinks
              ? JSON.parse(updateData.socialLinks as string)
              : atty.socialLinks ? JSON.parse(atty.socialLinks) : {}
            existingSocial.justia = justia.justiaUrl
            updateData.socialLinks = JSON.stringify(existingSocial)

            console.log(`  [${processed}] JUSTIA ✓ ${atty.name}${justia.bio ? ' +bio' : ''}${justia.website ? ' +website' : ''}`)
          }
        }

        // ── CalBar lookup (mostly for verification & section data) ──
        if (args.sources.includes('calbar')) {
          await sleep(1000 + Math.random() * 500)
          const calbar = await lookupCalBar(barNum)
          if (calbar) {
            stats.calbarHits++
            if (calbar.status) updateData.licenseStatus = calbar.status
            if (calbar.sections.length > 0 && !atty.practiceAreas) {
              updateData.claSections = JSON.stringify(calbar.sections)
            }
          }
        }

        // ── Persist ──
        if (Object.keys(updateData).length > 0 && !args.dryRun) {
          await prisma.productionAttorney.update({
            where: { id: atty.id },
            data: updateData,
          })
          stats.updated++
        } else if (Object.keys(updateData).length === 0) {
          stats.skipped++
        }
      } catch (err: any) {
        stats.errors++
        if (stats.errors <= 10) console.error(`  ERROR: ${atty.name} — ${err.message}`)
      }

      // Progress log every 50
      if (processed % 50 === 0) {
        console.log(`\n  ── Progress: ${processed} scanned | ${stats.updated} updated | ${stats.biosFound} bios | ${stats.headshotsFound} photos | ${stats.errors} errors ──\n`)
      }
    })

    if (args.limit && processed >= args.limit) break
  }

  console.log(`\n${'═'.repeat(55)}`)
  console.log(`  ${args.dryRun ? 'DRY RUN' : 'ENRICHMENT'} COMPLETE`)
  console.log(`${'═'.repeat(55)}\n`)
  console.log(`  Scanned:           ${stats.scanned}`)
  console.log(`  Skipped (no data): ${stats.skipped}`)
  console.log(`  Errors:            ${stats.errors}`)
  console.log()
  console.log(`  Directory hits:`)
  console.log(`    Avvo:            ${stats.avvoHits}`)
  console.log(`    Justia:          ${stats.justiaHits}`)
  console.log(`    CalBar:          ${stats.calbarHits}`)
  console.log()
  console.log(`  Data found:`)
  console.log(`    Bios:            ${stats.biosFound}`)
  console.log(`    Headshots:       ${stats.headshotsFound}`)
  console.log(`    Websites:        ${stats.websitesFound}`)
  console.log(`    Ratings:         ${stats.ratingsFound}`)
  console.log(`    Languages:       ${stats.languagesFound}`)
  console.log(`    Practice areas:  ${stats.practiceAreasFound}`)
  if (!args.dryRun) console.log(`\n  Rows updated:      ${stats.updated}`)
  console.log(`\n  Last cursor ID:    ${cursor || 'N/A'}`)
  console.log(`  (Use --start-after ${cursor} to resume)\n`)

  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
