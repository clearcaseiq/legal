import { PrismaClient } from '@prisma/client'
import { logger } from '../logger'
import {
  discoverLegalMatchProfileUrls,
  fetchLegalMatchHtml,
  fetchLegalMatchHtmlWithBrowser,
  LegalMatchFetchBlockedError,
} from './fetcher'
import { parseLegalMatchProfile } from './parser'
import { createImportRun, finalizeImportRun, listImportedSourceUrlHashes, updateImportRun } from './provenance'
import type { LegalMatchImportOptions, LegalMatchImportStats } from './types'
import { sha256, sleep } from './utils'
import { upsertLegalMatchAttorney } from './upsert'

export async function runLegalMatchImport(
  prisma: PrismaClient,
  options: LegalMatchImportOptions
) {
  const stats: LegalMatchImportStats = {
    pagesDiscovered: 0,
    pagesFetched: 0,
    pagesParsed: 0,
    attorneysCreated: 0,
    attorneysUpdated: 0,
    attorneysSkipped: 0,
  }
  const errors: string[] = []
  let importRunId: string | null = null

  if (!options.dryRun) {
    importRunId = await createImportRun(prisma, {
      mode: options.profileUrls?.length ? 'direct_urls' : options.discoveryMode ?? 'auto',
      notes: options.profileUrls?.length
        ? 'Import seeded from LEGALMATCH_PROFILE_URLS.'
        : `Import seeded from ${options.discoveryMode ?? 'auto'} discovery.`,
    })
  }

  try {
    const discoveryMaxProfiles =
      options.maxProfiles && options.skipKnownImported
        ? Math.max(options.maxProfiles * 10, options.maxProfiles + 100)
        : options.maxProfiles

    let profileUrls = await discoverLegalMatchProfileUrls({
      sitemapUrl: options.sitemapUrl,
      profileUrls: options.profileUrls,
      maxProfiles: discoveryMaxProfiles,
      searchQueries: options.searchQueries,
      discoveryMode: options.discoveryMode,
      discoveryOffset: options.discoveryOffset,
      searchPagesPerQuery: options.searchPagesPerQuery,
      browserHeadless: options.browserHeadless,
    })

    if (options.skipKnownImported && profileUrls.length > 0) {
      const existingHashes = new Set(await listImportedSourceUrlHashes(prisma))
      profileUrls = profileUrls.filter((url) => !existingHashes.has(sha256(url)))
      if (options.maxProfiles) {
        profileUrls = profileUrls.slice(0, options.maxProfiles)
      }
    }

    stats.pagesDiscovered = profileUrls.length
    await updateImportRun(prisma, importRunId, {
      pagesDiscovered: stats.pagesDiscovered,
    })

    for (let index = 0; index < profileUrls.length; index += 1) {
      const url = profileUrls[index]
      if (index > 0 && options.delayMs > 0) {
        await sleep(options.delayMs)
      }

      try {
        const fetched = await fetchProfilePage(url, options)
        stats.pagesFetched += 1

        const profile = parseLegalMatchProfile(fetched.html, fetched.finalUrl)
        stats.pagesParsed += 1

        if (options.dryRun) {
          stats.attorneysSkipped += 1
          logger.info({ url }, 'LegalMatch dry-run parsed attorney profile.')
        } else if (importRunId) {
          const result = await upsertLegalMatchAttorney(prisma, profile, importRunId)
          if (result.status === 'created') stats.attorneysCreated += 1
          if (result.status === 'updated') stats.attorneysUpdated += 1
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${url}: ${message}`)
        logger.error({ err: error, url }, 'LegalMatch import failed for profile URL.')
        if (error instanceof LegalMatchFetchBlockedError) {
          break
        }
      }
    }

    await finalizeImportRun(prisma, importRunId, {
      stats,
      errors,
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
    })

    return { stats, errors }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(message)
    await finalizeImportRun(prisma, importRunId, {
      stats,
      errors,
      status: 'failed',
    })
    throw error
  }
}

async function fetchProfilePage(url: string, options: LegalMatchImportOptions) {
  if (options.fetchMode === 'browser') {
    return fetchLegalMatchHtmlWithBrowser(url, {
      headless: options.browserHeadless,
    })
  }

  if (options.fetchMode === 'http') {
    return fetchLegalMatchHtml(url)
  }

  try {
    return await fetchLegalMatchHtml(url)
  } catch (error) {
    if (!(error instanceof LegalMatchFetchBlockedError)) throw error
    logger.warn({ url }, 'LegalMatch HTTP fetch was challenged. Retrying with browser mode.')
    return fetchLegalMatchHtmlWithBrowser(url, {
      headless: options.browserHeadless,
    })
  }
}

