/**
 * The liability evidence list on the case report.
 *
 * Every row here is a real input to the engine's liability score — an incident
 * or police report is worth +10, witness evidence +8, photos +5 — and none of
 * them are gated by claim type, so the list applies to any case. Two things
 * about how it was presented did not.
 *
 * The report row was labelled "Police report" on every case. Police reliably
 * attend collisions and assaults; a nursing-home fall or a workplace injury is
 * documented by an incident report the facility or employer files instead. The
 * intake wizard has drawn that distinction for a while, for the reason recorded
 * on `usesPoliceReportLabel`: showing "Police report" to someone who will never
 * have one reads as "nothing to upload here", when in fact the document that
 * would raise their score is sitting with the facility.
 *
 * "Fault appears clear" was listed alongside the documents and rendered "Not
 * added" when false. It is a conclusion the model draws, not a file anyone can
 * produce, so the row could never be satisfied by uploading anything — which
 * also left the "Add documents" button showing on cases with nothing left to
 * add.
 */

import { canonicalClaimType } from './claimTypes'

/**
 * Claim types where a police report is the document that actually exists.
 *
 * Seeded with slugs and then canonicalised, because several slugs share a
 * label and which one wins is decided by the order of the shared label map —
 * `assault` and `intentional_tort` both read "Assault & negligent security",
 * and only the first is canonical. Comparing raw slugs would silently stop
 * matching if that map were reordered.
 */
const POLICE_ATTENDED_CLAIMS = new Set(
  ['auto', 'vehicle', 'motor_vehicle', 'assault', 'intentional_tort'].map(canonicalClaimType),
)

export type LiabilityRowKey = 'report' | 'photos' | 'witnesses' | 'faultClear'

export interface LiabilityChecklistRow {
  key: LiabilityRowKey
  label: string
  ok: boolean
  /** Whether the claimant can close this row by uploading something. */
  uploadable: boolean
}

export function usesPoliceReportLabel(claimType: string | null | undefined): boolean {
  const canonical = canonicalClaimType(claimType)
  return canonical !== '' && POLICE_ATTENDED_CLAIMS.has(canonical)
}

export interface LiabilityChecklistLabels {
  policeReport: string
  incidentReport: string
  photosOfDamage: string
  photosOfScene: string
  witnessStatements: string
  faultAppearsClear: string
}

export interface LiabilityChecklistInput {
  claimType: string | null | undefined
  hasReport: boolean
  hasPhotos: boolean
  hasWitnesses: boolean
  faultClear: boolean
  labels: LiabilityChecklistLabels
}

export function buildLiabilityChecklist(input: LiabilityChecklistInput): LiabilityChecklistRow[] {
  const police = usesPoliceReportLabel(input.claimType)

  return [
    {
      key: 'report',
      label: police ? input.labels.policeReport : input.labels.incidentReport,
      ok: input.hasReport,
      uploadable: true,
    },
    {
      // "Photos of damage" suits a collision. On a nursing-home or medical claim
      // the photographs that matter are of the scene and the injury.
      key: 'photos',
      label: police ? input.labels.photosOfDamage : input.labels.photosOfScene,
      ok: input.hasPhotos,
      uploadable: true,
    },
    {
      key: 'witnesses',
      label: input.labels.witnessStatements,
      ok: input.hasWitnesses,
      uploadable: true,
    },
    {
      key: 'faultClear',
      label: input.labels.faultAppearsClear,
      ok: input.faultClear,
      uploadable: false,
    },
  ]
}

/**
 * Whether there is anything left for the claimant to upload.
 *
 * Deliberately ignores the rows they cannot act on, so the prompt disappears
 * once the case is fully documented rather than nagging about a conclusion.
 */
export function hasUploadableGap(rows: LiabilityChecklistRow[]): boolean {
  return rows.some((row) => row.uploadable && !row.ok)
}
