/**
 * Named reviewers who have actually reviewed content on this site.
 *
 * Intentionally empty. The mechanism exists so a real reviewer can be credited
 * the day one is engaged, but nothing here may be populated speculatively:
 *
 *  - A byline claiming attorney or clinician review that did not happen
 *    misrepresents the reliability of legal and medical guidance to people making
 *    decisions about their own injury claims.
 *  - Search engines assess expertise signals against verifiable reality, and
 *    fabricated credentials are treated as a trust violation rather than a
 *    ranking factor. An invented reviewer is worse than no reviewer.
 *  - `Person` structured data asserting false credentials is a
 *    misrepresentation in machine-readable form.
 *
 * To credit a reviewer: add them here, set `reviewedBy` on the pages they
 * actually reviewed, and give them a real profile URL a reader can check.
 */
export type ContentReviewer = {
  id: string
  name: string
  /** Post-nominal credentials exactly as the person is licensed to use them. */
  credentials: string
  /** One line establishing why this person is qualified on this subject. */
  bio: string
  /** Page a reader can visit to verify the person exists and is who we say. */
  profileUrl?: string
  /** State bar or licensing board record, where one exists publicly. */
  licenseUrl?: string
}

export const CONTENT_REVIEWERS: ContentReviewer[] = []

export const reviewerById = new Map(CONTENT_REVIEWERS.map((reviewer) => [reviewer.id, reviewer]))

export function reviewerFor(id: string | undefined): ContentReviewer | undefined {
  return id ? reviewerById.get(id) : undefined
}
