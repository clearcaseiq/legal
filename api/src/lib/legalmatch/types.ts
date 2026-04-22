export type LegalMatchLocation = {
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  phone?: string | null
}

export type LegalMatchProfile = {
  sourceUrl: string
  sourceUrlHash: string
  externalId?: string | null
  rawContentHash: string
  fullName: string
  firstName?: string | null
  lastName?: string | null
  firmName?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  photoUrl?: string | null
  bio?: string | null
  specialties: string[]
  languages: string[]
  averageRating?: number | null
  totalReviews?: number | null
  yearsExperience?: number | null
  locations: LegalMatchLocation[]
  parseWarnings: string[]
  sourcePayload: Record<string, unknown>
}

export type LegalMatchFetchResult = {
  url: string
  finalUrl: string
  status: number
  html: string
  challenged: boolean
}

export type LegalMatchImportOptions = {
  dryRun: boolean
  maxProfiles?: number
  delayMs: number
  fetchMode: 'auto' | 'http' | 'browser'
  browserHeadless: boolean
  discoveryMode?: 'auto' | 'sitemap' | 'search' | 'browser-search' | 'browser-index'
  discoveryOffset?: number
  searchPagesPerQuery?: number
  indexPages?: number
  sitemapUrl?: string
  profileUrls?: string[]
  searchQueries?: string[]
  skipKnownImported?: boolean
}

export type LegalMatchImportStats = {
  pagesDiscovered: number
  pagesFetched: number
  pagesParsed: number
  attorneysCreated: number
  attorneysUpdated: number
  attorneysSkipped: number
}
