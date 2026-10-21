/**
 * Writing a validated matter package: one case per matter, with its related
 * records attached to that case rather than flattened into its description.
 *
 * Each matter is its own transaction, so one bad matter fails alone and the
 * report says which. Every related record carries a stable key (its CMS id, or
 * a content hash when it has none); the keys written are kept on the intake
 * request, which is what makes re-importing the same matter safe — a merge adds
 * only records whose keys are new.
 */
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { logger } from './logger'
import { createAttorneyOwnedCase, finalizeAttorneyCases, type AttorneyCaseOwner } from './attorney-case-factory'
import { recordCaseChange } from './data-authority'
import {
  bundleCounts,
  bundleRecordKeys,
  type BundleCounts,
  type MatterBundle,
} from './matter-package'

export const MATTER_IMPORT_KIND = 'matter_import'

export type MatterImportOutcome = 'created' | 'merged' | 'unchanged' | 'skipped' | 'failed'

export type MatterImportReport = {
  externalId: string
  label: string
  outcome: MatterImportOutcome
  assessmentId: string | null
  /** For linking to the case workspace. */
  leadId?: string | null
  /** Records written in this run, per table. */
  imported: BundleCounts
  /** Records left alone because an earlier import already wrote them. */
  alreadyImported: number
  reason?: string
}

function day(value: string | null | undefined): Date | null {
  return value ? new Date(`${value}T12:00:00.000Z`) : null
}

export const EMPTY_BUNDLE_COUNTS: BundleCounts = {
  contacts: 0, medicalVisits: 0, medicalBills: 0, insurance: 0, liens: 0, expenses: 0,
  negotiations: 0, tasks: 0, notes: 0, timeline: 0, documents: 0,
}

/** Keys every earlier matter import wrote onto this case. */
export async function priorRecordKeys(assessmentId: string): Promise<Set<string>> {
  const rows = await prisma.caseIntakeRequest.findMany({
    where: { assessmentId, kind: MATTER_IMPORT_KIND },
    select: { payload: true },
  })
  const keys = new Set<string>()
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.payload || '{}')
      for (const key of parsed.recordKeys || []) keys.add(String(key))
    } catch {
      // A malformed payload just contributes no keys.
    }
  }
  return keys
}

/** The subset of a bundle whose records are not in `skip`. */
function withoutKeys(bundle: MatterBundle, skip: Set<string>): MatterBundle {
  const keep = <T extends { key: string }>(list: T[]) => list.filter((r) => !skip.has(r.key))
  return {
    ...bundle,
    contacts: keep(bundle.contacts),
    visits: keep(bundle.visits),
    bills: keep(bundle.bills),
    insurance: keep(bundle.insurance),
    liens: keep(bundle.liens),
    expenses: keep(bundle.expenses),
    negotiations: keep(bundle.negotiations),
    tasks: keep(bundle.tasks),
    notes: keep(bundle.notes),
    documents: keep(bundle.documents),
  }
}

async function writeRelated(
  tx: Prisma.TransactionClient,
  bundle: MatterBundle,
  ctx: { assessmentId: string; attorneyId: string; source: string; actorName: string | null; actorEmail: string | null; actorUserId: string | null },
) {
  const { assessmentId, attorneyId, source, actorName } = ctx

  if (bundle.contacts.length) {
    const lead = await tx.leadSubmission.findFirst({ where: { assessmentId }, select: { id: true } })
    if (lead) {
      for (const c of bundle.contacts) {
        await tx.caseContact.create({
          data: {
            leadId: lead.id,
            attorneyId,
            firstName: c.firstName || c.company || 'Unknown',
            lastName: c.lastName || '',
            email: c.email,
            phone: c.phone,
            fax: c.fax,
            companyName: c.company,
            title: c.role,
            contactType: c.contactType === 'defendant' ? 'other' : c.contactType,
            notes: [
              c.contactType === 'defendant' ? 'Defendant' : '',
              [c.street, c.city, c.state, c.zip].filter(Boolean).join(', '),
              `Imported from ${source}${c.contactId ? ` (contact ${c.contactId})` : ''}.`,
            ].filter(Boolean).join('\n'),
          },
        })
      }
    }
  }

  for (const v of bundle.visits) {
    const start = day(v.startDate)
    await tx.medicalTreatmentEntry.create({
      data: {
        assessmentId,
        provider: v.provider,
        specialty: v.specialty,
        visitType: v.visitType,
        startDate: start,
        endDate: day(v.endDate),
        status: start && start.getTime() < Date.now() ? 'completed' : 'ongoing',
        diagnosis: v.diagnosis,
        billedAmount: v.billedAmount,
        notes: v.notes,
        source: 'imported',
        diagnosisCodes: v.diagnosisCodes.length ? JSON.stringify(v.diagnosisCodes) : null,
        procedureCodes: v.procedureCodes.length ? JSON.stringify(v.procedureCodes) : null,
        createdByName: actorName,
      },
    })
  }

  for (const b of bundle.bills) {
    await tx.damageItem.create({
      data: {
        assessmentId,
        category: 'medical',
        description: b.description,
        amount: b.amount,
        documentedAmount: b.amount,
        paidAmount: b.paidAmount,
        adjustedAmount: b.adjustedAmount,
        billingStatus: b.status,
        provider: b.provider || null,
        payer: b.payer,
        incurredAt: day(b.incurredAt),
        source: 'imported',
        notes: b.balance !== null ? `Balance per ${source}: $${b.balance.toLocaleString('en-US')}` : null,
        createdByName: actorName,
      },
    })
  }

  for (const i of bundle.insurance) {
    await tx.insuranceDetail.create({
      data: {
        assessmentId,
        carrierName: i.carrierName,
        policyNumber: i.policyNumber,
        policyLimit: i.policyLimit,
        claimNumber: i.claimNumber,
        adjusterName: i.adjusterName,
        adjusterEmail: i.adjusterEmail,
        adjusterPhone: i.adjusterPhone,
        coverageType: i.coverageType,
        insuredParty: i.insuredParty,
        claimStatus: i.claimNumber ? 'open' : 'not_opened',
        claimNumberAt: i.claimNumber ? new Date() : null,
        notes: i.notes,
      },
    })
  }

  for (const l of bundle.liens) {
    await tx.lienHolder.create({
      data: { assessmentId, name: l.name, type: l.type, amount: l.amount, status: l.status, notes: l.notes },
    })
  }

  for (const e of bundle.expenses) {
    await tx.caseExpense.create({
      data: { assessmentId, category: e.category, description: e.description, amount: e.amount, incurredAt: day(e.incurredAt) },
    })
  }

  const defendantCarrier = bundle.insurance.find((i) => i.insuredParty !== 'client')
  for (const n of bundle.negotiations) {
    await tx.negotiationEvent.create({
      data: {
        assessmentId,
        eventType: n.eventType,
        amount: n.amount,
        eventDate: day(n.eventDate) ?? day(bundle.incidentDate) ?? new Date(),
        status: n.status,
        counterpartyType: n.counterpartyType,
        insurerName: defendantCarrier?.carrierName ?? null,
        adjusterName: defendantCarrier?.adjusterName ?? null,
        notes: n.notes ?? `Imported from ${source}.`,
        createdByName: actorName,
      },
    })
  }

  for (const t of bundle.tasks) {
    await tx.caseTask.create({
      data: {
        assessmentId,
        title: t.title,
        dueDate: day(t.dueDate),
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo,
        notes: [t.notes, `Imported from ${source}.`].filter(Boolean).join('\n\n'),
        completedAt: t.status === 'done' ? new Date() : null,
        createdByName: actorName,
      },
    })
  }

  for (const n of bundle.notes) {
    // Dated as the CMS dated them, so the history reads in its real order.
    const createdAt = day(n.date) ?? undefined
    await tx.caseNote.create({
      data: {
        assessmentId,
        authorName: n.author ?? actorName,
        noteType: n.kind === 'timeline' ? 'update' : 'internal',
        message: n.kind === 'timeline' ? `Timeline: ${n.message}` : n.message,
        ...(createdAt ? { createdAt } : {}),
      },
    })
  }

  if (bundle.documents.length) {
    await tx.caseNote.create({
      data: {
        assessmentId,
        authorName: actorName,
        noteType: 'evidence',
        message: [
          `Documents listed in the ${source} export (${bundle.documents.length}). The files themselves were not in the export; upload them or connect ${source} to bring them across.`,
          ...bundle.documents.map((d) =>
            `• ${d.name}${d.category ? ` (${d.category})` : ''}${d.date ? `, ${d.date}` : ''}${d.url ? ` — ${d.url}` : ''}`,
          ),
        ].join('\n'),
      },
    })
  }
}

/**
 * Import one matter.
 *
 * `existingAssessmentId` set means the matter is already on file: with
 * `mode: 'merge'` only records not written before are added (the case's own
 * facts are left as the attorney may have edited them); with `mode: 'skip'`
 * nothing is written.
 */
export async function importMatterBundle(params: {
  bundle: MatterBundle
  source: string
  owner: AttorneyCaseOwner
  attorneyId: string
  importId: string
  actor: { userId: string | null; name: string | null; email: string | null }
  existingAssessmentId: string | null
  mode: 'skip' | 'merge'
}): Promise<MatterImportReport> {
  const { bundle, source, owner, attorneyId, importId, actor, existingAssessmentId, mode } = params
  const base = { externalId: bundle.externalId, label: bundle.label }

  if (existingAssessmentId && mode === 'skip') {
    return { ...base, outcome: 'skipped', assessmentId: existingAssessmentId, imported: EMPTY_BUNDLE_COUNTS, alreadyImported: 0, reason: 'Already imported. Choose "Add new records" to merge changes into it.' }
  }

  const prior = existingAssessmentId ? await priorRecordKeys(existingAssessmentId) : new Set<string>()
  const toWrite = withoutKeys(bundle, prior)
  const allKeys = bundleRecordKeys(bundle)
  const alreadyImported = allKeys.filter((k) => prior.has(k)).length
  const newKeys = bundleRecordKeys(toWrite)

  if (existingAssessmentId && newKeys.length === 0) {
    return { ...base, outcome: 'unchanged', assessmentId: existingAssessmentId, imported: EMPTY_BUNDLE_COUNTS, alreadyImported }
  }

  try {
    const assessmentId = await prisma.$transaction(
      async (tx) => {
        let id = existingAssessmentId
        if (!id) {
          const defendantPolicy = bundle.insurance.find((i) => i.insuredParty === 'defendant') ?? bundle.insurance.find((i) => i.insuredParty !== 'client')
          const medCharges = bundle.bills.reduce((sum, b) => sum + b.amount, 0)
          const medPaid = bundle.bills.reduce((sum, b) => sum + (b.paidAmount ?? 0), 0)
          const factPaths: Record<string, string> = {}
          if (defendantPolicy?.carrierName) factPaths['insurance.defendant_carrier'] = defendantPolicy.carrierName
          if (defendantPolicy?.claimNumber) factPaths['insurance.claim_number'] = defendantPolicy.claimNumber
          if (defendantPolicy?.policyLimit) factPaths['insurance.defendant_coverage_limits'] = String(defendantPolicy.policyLimit)
          if (bundle.defendantName) factPaths['defendant.name'] = bundle.defendantName
          if (medCharges > 0) factPaths['damages.med_charges'] = String(medCharges)
          if (medPaid > 0) factPaths['damages.med_paid'] = String(medPaid)

          const created = await createAttorneyOwnedCase(
            {
              claimType: bundle.claimType,
              venueState: bundle.venueState!,
              venueCounty: bundle.venueCounty,
              incidentDate: bundle.incidentDate!,
              narrative: bundle.narrative,
              injuryDiagnoses: bundle.injuryDiagnoses,
              plaintiffFirstName: bundle.client?.firstName,
              plaintiffLastName: bundle.client?.lastName,
              plaintiffEmail: bundle.client?.email ?? undefined,
              plaintiffPhone: bundle.client?.phone ?? undefined,
              plaintiffAddressLine1: bundle.client?.street ?? undefined,
              plaintiffCity: bundle.client?.city ?? undefined,
              plaintiffPostalCode: bundle.client?.zip ?? undefined,
              importSource: source,
              externalId: bundle.externalId,
              rawImport: bundle.raw as Record<string, unknown>,
              factPaths,
            },
            owner,
            'import',
            tx,
          )
          id = created.assessmentId
        }

        await writeRelated(tx, toWrite, {
          assessmentId: id,
          attorneyId,
          source,
          actorName: actor.name,
          actorEmail: actor.email,
          actorUserId: actor.userId,
        })

        await tx.caseIntakeRequest.create({
          data: {
            attorneyId,
            assessmentId: id,
            kind: MATTER_IMPORT_KIND,
            source,
            status: existingAssessmentId ? 'merged' : 'imported',
            payload: JSON.stringify({
              importId,
              externalId: bundle.externalId,
              counts: bundleCounts(toWrite),
              recordKeys: newKeys,
              issues: bundle.issues,
            }),
          },
        })
        return id
      },
      { maxWait: 15_000, timeout: 120_000 },
    )

    if (!existingAssessmentId) await finalizeAttorneyCases([assessmentId])
    void recordCaseChange({
      assessmentId,
      source: 'cms_inbound',
      action: existingAssessmentId ? 'matter_import_merged' : 'matter_imported',
      entityType: 'assessment',
      entityId: assessmentId,
      summary: `${existingAssessmentId ? 'Merged' : 'Imported'} ${source} matter ${bundle.externalId}`,
      actor: { type: 'user', id: actor.userId ?? undefined, label: actor.name ?? undefined },
    })

    const lead = await prisma.leadSubmission.findFirst({ where: { assessmentId }, select: { id: true } }).catch(() => null)
    return {
      ...base,
      outcome: existingAssessmentId ? 'merged' : 'created',
      assessmentId,
      leadId: lead?.id ?? null,
      imported: bundleCounts(toWrite),
      alreadyImported,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Matter package import failed', { externalId: bundle.externalId, error: message })
    return { ...base, outcome: 'failed', assessmentId: existingAssessmentId, imported: EMPTY_BUNDLE_COUNTS, alreadyImported, reason: message }
  }
}
