import {
  ATTORNEY_GUIDES_APP_PATH,
  ATTORNEY_GUIDES_PATH,
  attorneyGuideAppPath,
  attorneyGuidePublicPath,
} from '../../data/attorneyGuidesSeo'

/** Where the guides render: inside the attorney workspace, or on the public site. */
export type GuideMode = 'app' | 'public'

export const ATTORNEY_GUIDES_OVERVIEW_VIDEO_URL = '/videos/attorney-guides-overview.mp4'
export const ATTORNEY_GUIDES_OVERVIEW_POSTER_URL = '/videos/attorney-guides-overview.jpg'
export const ATTORNEY_GUIDES_OVERVIEW_CAPTIONS_URL = '/videos/attorney-guides-overview.vtt'

export function guidesIndexHref(mode: GuideMode) {
  return mode === 'app' ? ATTORNEY_GUIDES_APP_PATH : ATTORNEY_GUIDES_PATH
}

export function guideHref(mode: GuideMode, slug: string) {
  return mode === 'app' ? attorneyGuideAppPath(slug) : attorneyGuidePublicPath(slug)
}

/** Anchor id for a section heading, stable across renders so contents links work. */
export function sectionAnchor(heading: string) {
  return heading
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
