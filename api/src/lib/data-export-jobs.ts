import crypto from 'crypto'
import dns from 'dns/promises'
import fs from 'fs'
import net from 'net'
import os from 'os'
import path from 'path'
import { once } from 'events'
import { prisma } from './prisma'
import { logger } from './logger'
import {
  deleteUpload,
  ensureLocalCopy,
  persistUpload,
  storageKeyForPath,
  uploadsRoot,
} from './object-storage'
import { decryptSecret, encryptSecret } from './cms/crypto'

const archiver: any = require('archiver')

export const DATA_EXPORT_SCHEMA_VERSION = '1.0'
export const MAX_EXPORT_ATTEMPTS = 3
const STALE_EXPORT_MS = 30 * 60 * 1000
const EXPORT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const WEBHOOK_MAX_ATTEMPTS = 6

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  }
  const value = address.toLowerCase()
  return value === '::1' || value === '::' || value.startsWith('fc') ||
    value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') ||
    value.startsWith('fea') || value.startsWith('feb')
}

export async function validatePublicWebhookUrl(value: string): Promise<boolean> {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') return false
    const addresses = await dns.lookup(url.hostname, { all: true })
    return addresses.length > 0 && addresses.every((entry) => !isPrivateAddress(entry.address))
  } catch {
    return false
  }
}

type ExportKind = 'snapshot' | 'incremental'
type DatasetFile = {
  path: string
  absolutePath: string
  rowCount: number
  byteSize: number
  contentHash: string
}
type BinaryFile = {
  sourceId: string
  sourcePath: string
  archivePath: string
  kind: string
}
type ExportOmission = { source_id: string; reason: string }
type PreparedExport = {
  cutoff: number
  datasets: DatasetFile[]
  binaries: BinaryFile[]
  assessmentRevisions: Record<string, number>
  omissions: ExportOmission[]
  evidenceExpected: number
}

const PAGE_SIZE = 250
const EXPORT_TRANSACTION_TIMEOUT_MS = 10 * 60 * 1000
const SECRET_EXPORT_FIELDS = new Set([
  'passwordHash',
  'mfaSecret',
  'mfaBackupCodes',
  'secureToken',
  'uploadLink',
  'manageToken',
  'hostMeetingUrl',
  'signingUrl',
  'countersignUrl',
  'shareToken',
  'accessToken',
  'refreshToken',
  'tokenHash',
  'webhookSecret',
  'filePath',
  'fileUrl',
  'sourceFilePath',
  'signedFilePath',
  'path',
])

function sha256(value: Buffer | string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function outputPath(lawFirmId: string, runId: string): string {
  return path.join(uploadsRoot(), 'data-exports', lawFirmId, `${runId}.zip`)
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160) || 'file'
}

export function sanitizeExportRecord(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeExportRecord)
  if (!value || typeof value !== 'object' || value instanceof Date) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SECRET_EXPORT_FIELDS.has(key))
      .map(([key, child]) => [key, sanitizeExportRecord(child)]),
  )
}

class JsonlWriter {
  readonly absolutePath: string
  private readonly stream: fs.WriteStream
  private readonly hash = crypto.createHash('sha256')
  rowCount = 0
  byteSize = 0

  constructor(readonly archivePath: string, directory: string) {
    this.absolutePath = path.join(directory, archivePath)
    fs.mkdirSync(path.dirname(this.absolutePath), { recursive: true })
    this.stream = fs.createWriteStream(this.absolutePath)
  }

  async append(rows: unknown[]): Promise<void> {
    for (const row of rows) {
      const bytes = Buffer.from(`${JSON.stringify(sanitizeExportRecord(row))}\n`)
      this.hash.update(bytes)
      this.rowCount += 1
      this.byteSize += bytes.length
      if (!this.stream.write(bytes)) await once(this.stream, 'drain')
    }
  }

  async finish(): Promise<DatasetFile> {
    this.stream.end()
    await once(this.stream, 'close')
    return {
      path: this.archivePath,
      absolutePath: this.absolutePath,
      rowCount: this.rowCount,
      byteSize: this.byteSize,
      contentHash: this.hash.digest('hex'),
    }
  }
}

export function activeExportConsent(consent: { granted: boolean; revokedAt: Date | null; expiresAt: Date | null }): boolean {
  return consent.granted && !consent.revokedAt && (!consent.expiresAt || consent.expiresAt > new Date())
}

async function exportActorAttorneyId(tx: any, run: {
  lawFirmId: string
  requestedByUserId: string | null
  requestedBySyncKeyId: string | null
}): Promise<string | null> {
  let userId = run.requestedByUserId
  if (!userId && run.requestedBySyncKeyId) {
    const key = await tx.syncApiKey.findUnique({
      where: { id: run.requestedBySyncKeyId },
      select: { createdByUserId: true },
    })
    userId = key?.createdByUserId ?? null
  }
  if (!userId) return null
  const member = await tx.firmMember.findFirst({
    where: { lawFirmId: run.lawFirmId, userId, status: 'active' },
    select: { attorneyId: true },
  })
  return member?.attorneyId ?? null
}

export async function enqueueDataExport(input: {
  lawFirmId: string
  kind: ExportKind
  sinceCursor?: number | null
  requestedByUserId?: string | null
  requestedBySyncKeyId?: string | null
  webhookUrl?: string | null
  webhookSecret?: string | null
}) {
  const row = await prisma.dataExportRun.create({
    data: {
      lawFirmId: input.lawFirmId,
      kind: input.kind,
      sinceCursor: input.kind === 'incremental' ? input.sinceCursor ?? 0 : null,
      requestedByUserId: input.requestedByUserId ?? null,
      requestedBySyncKeyId: input.requestedBySyncKeyId ?? null,
      webhookUrl: input.webhookUrl ?? null,
      webhookSecret: encryptSecret(input.webhookSecret),
      webhookEventId: input.webhookUrl ? crypto.randomUUID() : null,
      webhookStatus: input.webhookUrl ? 'pending' : null,
    },
  })
  scheduleDataExport(row.id)
  return row
}

let buildChain: Promise<unknown> = Promise.resolve()

export function scheduleDataExport(runId: string): void {
  buildChain = buildChain.then(() => runDataExport(runId)).catch(() => undefined)
}

async function prepareExport(run: {
  id: string
  lawFirmId: string
  kind: string
  sinceCursor: number | null
  requestedByUserId: string | null
  requestedBySyncKeyId: string | null
}, tempDirectory: string): Promise<PreparedExport> {
  const datasetPaths = [
    'firm.jsonl', 'firm_members.jsonl', 'firm_offices.jsonl', 'firm_teams.jsonl',
    'firm_team_members.jsonl', 'billing_rates.jsonl', 'cases.jsonl', 'consents.jsonl',
    'lead_submissions.jsonl', 'case_contacts.jsonl', 'case_notes.jsonl',
    'case_question_answers.jsonl', 'case_tasks.jsonl', 'case_comment_threads.jsonl',
    'case_comments.jsonl', 'case_threads.jsonl', 'case_messages.jsonl', 'chat_rooms.jsonl',
    'messages.jsonl', 'appointments.jsonl', 'calendar_events.jsonl', 'calls.jsonl',
    'insurance_details.jsonl', 'lien_holders.jsonl', 'settlement_scenarios.jsonl',
    'case_expenses.jsonl', 'damage_items.jsonl', 'damage_item_changes.jsonl',
    'liability_records.jsonl', 'liability_defendants.jsonl',
    'liability_evidence_items.jsonl', 'medical_treatment_entries.jsonl',
    'medical_case_records.jsonl', 'negotiation_events.jsonl',
    'negotiation_insights.jsonl', 'case_health_snapshots.jsonl',
    'billing_invoices.jsonl', 'recurring_invoices.jsonl', 'time_entries.jsonl',
    'case_workflows.jsonl', 'case_workflow_items.jsonl', 'demand_letters.jsonl',
    'demand_packages.jsonl', 'demand_audits.jsonl', 'document_requests.jsonl',
    'document_envelopes.jsonl', 'external_document_uploads.jsonl',
    'case_letters.jsonl', 'representation_attestations.jsonl',
    'opposing_document_request_suggestions.jsonl', 'case_assistance.jsonl',
    'case_interactions.jsonl', 'files.jsonl', 'evidence_files.jsonl',
    'evidence_annotations.jsonl', 'extracted_data.jsonl', 'document_findings.jsonl',
    'predictions.jsonl', 'attorney_case_reviews.jsonl', 'case_outcomes.jsonl',
    'case_change_events.jsonl',
  ]
  const writers = new Map(datasetPaths.map((name) => [name, new JsonlWriter(name, tempDirectory)]))
  const append = async (name: string, rows: unknown[]) => writers.get(name)!.append(rows)
  const binaries: BinaryFile[] = []
  const omissions: ExportOmission[] = []
  const assessmentRevisions: Record<string, number> = {}
  let evidenceExpected = 0
  let cutoff = 0

  try {
    await prisma.$transaction(async (tx) => {
      const latest = await tx.caseChangeEvent.findFirst({
        where: { lawFirmId: run.lawFirmId },
        orderBy: { seq: 'desc' },
        select: { seq: true },
      })
      cutoff = latest?.seq ?? 0
      const actorAttorneyId = await exportActorAttorneyId(tx, run)

      await append('firm.jsonl', await tx.lawFirm.findMany({
        where: { id: run.lawFirmId },
        select: {
          id: true, name: true, slug: true, primaryEmail: true, phone: true, website: true,
          address: true, city: true, state: true, zip: true, createdAt: true, updatedAt: true,
        },
      }))
      await append('firm_members.jsonl', await tx.firmMember.findMany({
        where: { lawFirmId: run.lawFirmId },
        select: {
          id: true, lawFirmId: true, userId: true, attorneyId: true, officeId: true,
          role: true, title: true, status: true, joinedAt: true, createdAt: true, updatedAt: true,
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
        orderBy: { id: 'asc' },
      }))
      await append('firm_offices.jsonl', await tx.firmOffice.findMany({ where: { lawFirmId: run.lawFirmId }, orderBy: { id: 'asc' } }))
      const teams = await tx.firmTeam.findMany({ where: { lawFirmId: run.lawFirmId }, orderBy: { id: 'asc' } })
      await append('firm_teams.jsonl', teams)
      await append('firm_team_members.jsonl', await tx.firmTeamMember.findMany({
        where: { teamId: { in: teams.map((row) => row.id) } },
        orderBy: { id: 'asc' },
      }))
      await append('billing_rates.jsonl', await tx.billingRate.findMany({ where: { lawFirmId: run.lawFirmId }, orderBy: { id: 'asc' } }))

      let caseCursor: string | undefined
      while (true) {
        const rawCases = await tx.assessment.findMany({
          where: {
            lawFirmId: run.lawFirmId,
            ...(actorAttorneyId ? { ethicalWalls: { none: { blockedAttorneyId: actorAttorneyId } } } : {}),
            ...(run.kind === 'incremental'
              ? { changeEvents: { some: { seq: { gt: run.sinceCursor ?? 0, lte: cutoff } } } }
              : {}),
          },
          orderBy: { id: 'asc' },
          take: PAGE_SIZE,
          ...(caseCursor ? { cursor: { id: caseCursor }, skip: 1 } : {}),
        })
        if (!rawCases.length) break
        caseCursor = rawCases[rawCases.length - 1].id

        const rawCaseIds = rawCases.map((row) => row.id)
        const consents = await tx.consent.findMany({
          where: { assessmentId: { in: rawCaseIds }, consentType: { in: ['attorney_share', 'hipaa'] } },
          orderBy: [{ assessmentId: 'asc' }, { createdAt: 'desc' }],
        })
        const latestConsent = new Map<string, any>()
        for (const consent of consents) {
          const key = `${consent.assessmentId}:${consent.consentType}`
          if (!latestConsent.has(key)) latestConsent.set(key, consent)
        }
        const cases = rawCases.filter((record) => {
          const consent = latestConsent.get(`${record.id}:attorney_share`)
          const denied = !record.importSource && consent && !activeExportConsent(consent)
          if (denied) omissions.push({ source_id: record.id, reason: 'attorney_share_consent_inactive' })
          return !denied
        })
        const caseIds = cases.map((row) => row.id)
        if (!caseIds.length) continue
        for (const record of cases) assessmentRevisions[record.id] = record.revision
        await append('cases.jsonl', cases)
        await append('consents.jsonl', consents.filter((row) => caseIds.includes(row.assessmentId!)))

        const whereCase = { assessmentId: { in: caseIds } }
        const direct: Array<[string, string, any]> = [
          ['case_notes.jsonl', 'caseNote', whereCase],
          ['case_question_answers.jsonl', 'caseQuestionAnswer', whereCase],
          ['case_tasks.jsonl', 'caseTask', whereCase],
          ['appointments.jsonl', 'appointment', whereCase],
          ['calendar_events.jsonl', 'calendarEvent', whereCase],
          ['calls.jsonl', 'call', whereCase],
          ['insurance_details.jsonl', 'insuranceDetail', whereCase],
          ['lien_holders.jsonl', 'lienHolder', whereCase],
          ['settlement_scenarios.jsonl', 'settlementScenario', whereCase],
          ['case_expenses.jsonl', 'caseExpense', whereCase],
          ['damage_items.jsonl', 'damageItem', whereCase],
          ['damage_item_changes.jsonl', 'damageItemChange', whereCase],
          ['liability_records.jsonl', 'liabilityRecord', whereCase],
          ['liability_defendants.jsonl', 'liabilityDefendant', whereCase],
          ['liability_evidence_items.jsonl', 'liabilityEvidenceItem', whereCase],
          ['medical_treatment_entries.jsonl', 'medicalTreatmentEntry', whereCase],
          ['medical_case_records.jsonl', 'medicalCaseRecord', whereCase],
          ['negotiation_events.jsonl', 'negotiationEvent', whereCase],
          ['negotiation_insights.jsonl', 'negotiationInsight', whereCase],
          ['case_health_snapshots.jsonl', 'caseHealthSnapshot', whereCase],
          ['billing_invoices.jsonl', 'billingInvoice', whereCase],
          ['recurring_invoices.jsonl', 'recurringInvoice', whereCase],
          ['time_entries.jsonl', 'timeEntry', whereCase],
          ['demand_letters.jsonl', 'demandLetter', whereCase],
          ['demand_packages.jsonl', 'demandPackage', whereCase],
          ['demand_audits.jsonl', 'demandAudit', whereCase],
          ['opposing_document_request_suggestions.jsonl', 'opposingDocRequestSuggestion', whereCase],
          ['case_assistance.jsonl', 'caseAssistance', whereCase],
          ['predictions.jsonl', 'prediction', whereCase],
          ['case_outcomes.jsonl', 'caseOutcome', whereCase],
        ]
        for (const [dataset, delegate, where] of direct) {
          await append(dataset, await (tx as any)[delegate].findMany({ where, orderBy: { id: 'asc' } }))
        }
        await append('attorney_case_reviews.jsonl', await tx.attorneyCaseReview.findMany({
          where: { caseId: { in: caseIds } },
          orderBy: { id: 'asc' },
        }))

        const comments = await tx.caseCommentThread.findMany({ where: whereCase, orderBy: { id: 'asc' } })
        await append('case_comment_threads.jsonl', comments)
        await append('case_comments.jsonl', await tx.caseComment.findMany({
          where: { threadId: { in: comments.map((row) => row.id) } },
          orderBy: { id: 'asc' },
        }))
        const threads = await tx.caseThread.findMany({ where: whereCase, orderBy: { id: 'asc' } })
        await append('case_threads.jsonl', threads)
        await append('case_messages.jsonl', await tx.caseMessage.findMany({
          where: { threadId: { in: threads.map((row) => row.id) } },
          orderBy: { id: 'asc' },
        }))
        const chatRooms = await tx.chatRoom.findMany({ where: whereCase, orderBy: { id: 'asc' } })
        await append('chat_rooms.jsonl', chatRooms)
        await append('messages.jsonl', await tx.message.findMany({
          where: { chatRoomId: { in: chatRooms.map((row) => row.id) } },
          orderBy: { id: 'asc' },
        }))
        const workflows = await tx.caseWorkflow.findMany({ where: whereCase, orderBy: { id: 'asc' } })
        await append('case_workflows.jsonl', workflows)
        await append('case_workflow_items.jsonl', await tx.caseWorkflowItem.findMany({
          where: { caseWorkflowId: { in: workflows.map((row) => row.id) } },
          orderBy: { id: 'asc' },
        }))

        const leads = await tx.leadSubmission.findMany({ where: whereCase, orderBy: { id: 'asc' } })
        const leadIds = leads.map((row) => row.id)
        await append('lead_submissions.jsonl', leads)
        await append('case_contacts.jsonl', await tx.caseContact.findMany({ where: { leadId: { in: leadIds } }, orderBy: { id: 'asc' } }))
        const requests = await tx.documentRequest.findMany({ where: { leadId: { in: leadIds } }, orderBy: { id: 'asc' } })
        await append('document_requests.jsonl', requests)
        const envelopes = await tx.documentEnvelope.findMany({ where: { leadId: { in: leadIds } }, orderBy: { id: 'asc' } })
        await append('document_envelopes.jsonl', envelopes)
        const caseLetters = await tx.caseLetter.findMany({ where: { leadId: { in: leadIds } }, orderBy: { id: 'asc' } })
        await append('case_letters.jsonl', caseLetters)
        await append('representation_attestations.jsonl', await tx.representationAttestation.findMany({ where: { leadId: { in: leadIds } }, orderBy: { id: 'asc' } }))
        await append('case_interactions.jsonl', await tx.caseInteraction.findMany({ where: whereCase, orderBy: { id: 'asc' } }))
        const uploads = await tx.externalDocumentUpload.findMany({
          where: { documentRequestId: { in: requests.map((row) => row.id) } },
          orderBy: { id: 'asc' },
        })
        await append('external_document_uploads.jsonl', uploads)

        const files = await tx.file.findMany({ where: whereCase, orderBy: { id: 'asc' } })
        await append('files.jsonl', files.map(({ path: _path, ...record }) => ({
          ...record,
          archive_path: `files/${record.assessmentId ?? 'unassigned'}/${record.id}/${safeName(record.originalName)}`,
        })))
        for (const file of files) binaries.push({
          sourceId: file.id,
          sourcePath: file.path,
          archivePath: `files/${file.assessmentId ?? 'unassigned'}/${file.id}/${safeName(file.originalName)}`,
          kind: 'file',
        })

        const evidence = await tx.evidenceFile.findMany({ where: whereCase, orderBy: { id: 'asc' } })
        evidenceExpected += evidence.length
        const permittedEvidence = evidence.filter((record) => {
          if (!record.isHIPAA) return true
          const consent = latestConsent.get(`${record.assessmentId}:hipaa`)
          const denied = consent && !activeExportConsent(consent)
          if (denied) omissions.push({ source_id: record.id, reason: 'hipaa_consent_inactive' })
          return !denied
        })
        await append('evidence_files.jsonl', permittedEvidence.map(({ filePath: _filePath, fileUrl: _fileUrl, ...record }) => ({
          ...record,
          archive_path: `evidence/${record.assessmentId ?? 'unassigned'}/${record.id}/${safeName(record.originalName)}`,
        })))
        const evidenceIds = permittedEvidence.map((row) => row.id)
        await append('evidence_annotations.jsonl', await tx.evidenceAnnotation.findMany({ where: { evidenceFileId: { in: evidenceIds } }, orderBy: { id: 'asc' } }))
        await append('extracted_data.jsonl', await tx.extractedData.findMany({ where: { evidenceFileId: { in: evidenceIds } }, orderBy: { id: 'asc' } }))
        await append('document_findings.jsonl', await tx.documentFinding.findMany({ where: { evidenceFileId: { in: evidenceIds } }, orderBy: { id: 'asc' } }))
        for (const file of permittedEvidence) binaries.push({
          sourceId: file.id,
          sourcePath: file.filePath,
          archivePath: `evidence/${file.assessmentId ?? 'unassigned'}/${file.id}/${safeName(file.originalName)}`,
          kind: 'evidence',
        })
        for (const upload of uploads) binaries.push({
          sourceId: upload.id,
          sourcePath: upload.filePath,
          archivePath: `external-documents/${upload.documentRequestId}/${upload.id}/${safeName(upload.originalName)}`,
          kind: 'external_document',
        })
        for (const letter of caseLetters) binaries.push({
          sourceId: letter.id,
          sourcePath: letter.filePath,
          archivePath: `case-letters/${letter.leadId}/${letter.id}.pdf`,
          kind: 'case_letter',
        })
        for (const envelope of envelopes) {
          if (envelope.signedFilePath) binaries.push({
            sourceId: envelope.id,
            sourcePath: envelope.signedFilePath,
            archivePath: `signed-documents/${envelope.leadId}/${envelope.id}.pdf`,
            kind: 'signed_document',
          })
        }
      }

      let eventCursor: number | undefined
      while (true) {
        const events = await tx.caseChangeEvent.findMany({
          where: {
            lawFirmId: run.lawFirmId,
            seq: { ...(run.kind === 'incremental' ? { gt: run.sinceCursor ?? 0 } : {}), lte: cutoff },
          },
          orderBy: { seq: 'asc' },
          take: PAGE_SIZE,
          ...(eventCursor ? { cursor: { seq: eventCursor }, skip: 1 } : {}),
        })
        if (!events.length) break
        eventCursor = events[events.length - 1].seq
        await append('case_change_events.jsonl', events)
      }
    }, { isolationLevel: 'RepeatableRead', timeout: EXPORT_TRANSACTION_TIMEOUT_MS })

    const datasets: DatasetFile[] = []
    for (const writer of writers.values()) datasets.push(await writer.finish())
    return { cutoff, datasets, binaries, assessmentRevisions, omissions, evidenceExpected }
  } catch (error) {
    for (const writer of writers.values()) {
      await writer.finish().catch(() => undefined)
    }
    throw error
  }
}

export async function runDataExport(runId: string): Promise<void> {
  const claimed = await prisma.dataExportRun.updateMany({
    where: { id: runId, status: 'queued', attempts: { lt: MAX_EXPORT_ATTEMPTS } },
    data: { status: 'building', startedAt: new Date(), attempts: { increment: 1 }, error: null, failedAt: null },
  })
  if (!claimed.count) return
  const run = await prisma.dataExportRun.findUnique({ where: { id: runId } })
  if (!run) return

  const destination = outputPath(run.lawFirmId, run.id)
  const tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), `cciq-export-${run.id}-`))
  const ledger: Array<{
    kind: string; sourceId?: string; archivePath: string; rowCount?: number; byteSize: number; contentHash: string; status?: string; error?: string
  }> = []
  const omissions: Array<{ source_id: string; reason: string }> = []

  try {
    const prepared = await prepareExport(run, tempDirectory)
    omissions.push(...prepared.omissions)
    await fs.promises.mkdir(path.dirname(destination), { recursive: true })
    const output = fs.createWriteStream(destination)
    const archive = archiver('zip', { zlib: { level: 6 } })
    archive.pipe(output)

    const rowCounts: Record<string, number> = {}
    for (const dataset of prepared.datasets) {
      archive.append(fs.createReadStream(dataset.absolutePath), { name: dataset.path })
      rowCounts[dataset.path] = dataset.rowCount
      ledger.push({
        kind: 'dataset',
        archivePath: dataset.path,
        rowCount: dataset.rowCount,
        byteSize: dataset.byteSize,
        contentHash: dataset.contentHash,
      })
    }

    for (const file of prepared.binaries) {
      const absolute = path.resolve(process.cwd(), file.sourcePath)
      if (!storageKeyForPath(absolute) || !(await ensureLocalCopy(absolute))) {
        omissions.push({ source_id: file.sourceId, reason: 'binary_unavailable' })
        continue
      }
      const stat = await fs.promises.stat(absolute)
      const contentHash = await hashFile(absolute)
      archive.append(fs.createReadStream(absolute), { name: file.archivePath })
      ledger.push({
        kind: file.kind,
        sourceId: file.sourceId,
        archivePath: file.archivePath,
        byteSize: stat.size,
        contentHash,
      })
    }

    const manifest = {
      schema_version: DATA_EXPORT_SCHEMA_VERSION,
      export_id: run.id,
      export_kind: run.kind,
      law_firm_id: run.lawFirmId,
      created_at: new Date().toISOString(),
      since_cursor: run.sinceCursor,
      cutoff_cursor: prepared.cutoff,
      assessment_revisions: prepared.assessmentRevisions,
      datasets: ledger.map((item) => ({
        path: item.archivePath,
        kind: item.kind,
        source_id: item.sourceId ?? null,
        rows: item.rowCount ?? null,
        bytes: item.byteSize,
        sha256: item.contentHash,
      })),
      row_counts: rowCounts,
      omissions,
      reconciliation: {
        database_rows: Object.values(rowCounts).reduce((sum, count) => sum + count, 0),
        written_rows: ledger.reduce((sum, item) => sum + (item.rowCount ?? 0), 0),
        evidence_expected: prepared.evidenceExpected,
        evidence_written: ledger.filter((item) => item.kind === 'evidence').length,
      },
    }
    const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2))
    archive.append(manifestBytes, { name: 'manifest.json' })
    ledger.push({
      kind: 'manifest',
      archivePath: 'manifest.json',
      byteSize: manifestBytes.length,
      contentHash: sha256(manifestBytes),
    })

    await archive.finalize()
    await once(output, 'close')
    await persistUpload(destination)
    const stat = await fs.promises.stat(destination)
    const fileHash = await hashFile(destination)
    const expiresAt = new Date(Date.now() + EXPORT_RETENTION_MS)

    await prisma.$transaction([
      prisma.dataExportArtifact.deleteMany({ where: { exportRunId: run.id } }),
      prisma.dataExportArtifact.createMany({
        data: ledger.map((item) => ({
          exportRunId: run.id,
          kind: item.kind,
          sourceId: item.sourceId ?? null,
          archivePath: item.archivePath,
          rowCount: item.rowCount ?? null,
          byteSize: item.byteSize,
          contentHash: item.contentHash,
          status: item.status ?? 'ready',
          error: item.error ?? null,
        })),
      }),
      prisma.dataExportRun.update({
        where: { id: run.id },
        data: {
          status: 'ready',
          cutoffCursor: prepared.cutoff,
          rowCounts: JSON.stringify(rowCounts),
          reconciliation: JSON.stringify(manifest.reconciliation),
          filePath: path.relative(process.cwd(), destination),
          fileSize: stat.size,
          contentHash: fileHash,
          manifestHash: sha256(manifestBytes),
          expiresAt,
          completedAt: new Date(),
          webhookNextAttemptAt: run.webhookUrl ? new Date() : null,
        },
      }),
    ])
    logger.info('Firm data export built', { exportId: run.id, bytes: stat.size, cutoff: prepared.cutoff })
    if (run.webhookUrl) await deliverDataExportWebhook(run.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const retry = run.attempts < MAX_EXPORT_ATTEMPTS
    logger.error('Firm data export failed', { exportId: run.id, attempt: run.attempts, error: message })
    await fs.promises.rm(destination, { force: true }).catch(() => undefined)
    await prisma.dataExportRun.update({
      where: { id: run.id },
      data: {
        status: retry ? 'queued' : 'failed',
        error: message.slice(0, 4000),
        failedAt: retry ? null : new Date(),
        webhookNextAttemptAt: !retry && run.webhookUrl ? new Date() : null,
      },
    })
  } finally {
    await fs.promises.rm(tempDirectory, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256')
  const stream = fs.createReadStream(filePath)
  stream.on('data', (chunk) => hash.update(chunk))
  await once(stream, 'end')
  return hash.digest('hex')
}

export async function dataExportFile(run: { filePath: string | null }): Promise<string | null> {
  if (!run.filePath) return null
  const absolute = path.resolve(process.cwd(), run.filePath)
  if (!storageKeyForPath(absolute)) return null
  return (await ensureLocalCopy(absolute)) ? absolute : null
}

export function dataExportView(run: any) {
  return {
    id: run.id,
    kind: run.kind,
    status: run.status,
    since_cursor: run.sinceCursor,
    cutoff_cursor: run.cutoffCursor,
    attempts: run.attempts,
    error: run.status === 'failed' ? run.error : null,
    row_counts: run.rowCounts ? JSON.parse(run.rowCounts) : null,
    reconciliation: run.reconciliation ? JSON.parse(run.reconciliation) : null,
    file_size: run.fileSize,
    sha256: run.contentHash,
    expires_at: run.expiresAt?.toISOString() ?? null,
    webhook_status: run.webhookStatus,
    created_at: run.createdAt.toISOString(),
    completed_at: run.completedAt?.toISOString() ?? null,
  }
}

export async function ensureWebhookEventId(
  runId: string,
  current: string | null,
  client: Pick<typeof prisma, 'dataExportRun'> = prisma,
): Promise<string> {
  if (current) return current
  const candidate = crypto.randomUUID()
  await client.dataExportRun.updateMany({
    where: { id: runId, webhookEventId: null },
    data: { webhookEventId: candidate },
  })
  const persisted = await client.dataExportRun.findUnique({
    where: { id: runId },
    select: { webhookEventId: true },
  })
  return persisted?.webhookEventId ?? candidate
}

export async function deliverDataExportWebhook(runId: string): Promise<boolean> {
  const run = await prisma.dataExportRun.findUnique({ where: { id: runId } })
  if (!run?.webhookUrl || !run.webhookSecret || run.webhookStatus === 'delivered') return false
  if (run.webhookAttempts >= WEBHOOK_MAX_ATTEMPTS) return false
  const secret = decryptSecret(run.webhookSecret)
  if (!secret) return false

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const eventId = await ensureWebhookEventId(run.id, run.webhookEventId)
  const body = JSON.stringify({
    event: run.status === 'ready' ? 'data_export.completed' : 'data_export.failed',
    event_id: eventId,
    export: dataExportView(run),
    download_path: `/v1/sync/exports/${run.id}/download`,
  })
  const signature = createHmacSignature(secret, timestamp, eventId, body)
  try {
    if (!(await validatePublicWebhookUrl(run.webhookUrl))) throw new Error('Webhook URL is not a public HTTPS endpoint')
    const response = await fetch(run.webhookUrl, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'content-type': 'application/json',
        'x-cciq-timestamp': timestamp,
        'x-cciq-event-id': eventId,
        'x-cciq-signature': signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await prisma.dataExportRun.update({
      where: { id: run.id },
      data: {
        webhookStatus: 'delivered',
        webhookAttempts: { increment: 1 },
        webhookDeliveredAt: new Date(),
        webhookNextAttemptAt: null,
      },
    })
    await prisma.auditLog.create({
      data: {
        action: 'data_export.webhook.delivered',
        entityType: 'data_export_run',
        entityId: run.id,
        statusCode: response.status,
        metadata: JSON.stringify({ lawFirmId: run.lawFirmId, eventId, attempt: run.webhookAttempts + 1 }),
      },
    }).catch((error) => logger.warn('Failed to audit export webhook delivery', { exportId: run.id, error }))
    return true
  } catch (error) {
    const attempts = run.webhookAttempts + 1
    const terminal = attempts >= WEBHOOK_MAX_ATTEMPTS
    await prisma.dataExportRun.update({
      where: { id: run.id },
      data: {
        webhookStatus: terminal ? 'failed' : 'pending',
        webhookAttempts: attempts,
        webhookNextAttemptAt: terminal ? null : new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000),
      },
    })
    await prisma.auditLog.create({
      data: {
        action: 'data_export.webhook.failed',
        entityType: 'data_export_run',
        entityId: run.id,
        metadata: JSON.stringify({
          lawFirmId: run.lawFirmId,
          eventId,
          attempt: attempts,
          terminal,
          error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
        }),
      },
    }).catch((auditError) => logger.warn('Failed to audit export webhook failure', { exportId: run.id, error: auditError }))
    logger.warn('Data export webhook delivery failed', {
      exportId: run.id,
      attempt: attempts,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

export function createHmacSignature(secret: string, timestamp: string, eventId: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${eventId}.${body}`).digest('hex')
}

export async function sweepDataExports(): Promise<{ requeued: number; started: number; expired: number; webhooks: number }> {
  const stale = await prisma.dataExportRun.updateMany({
    where: { status: 'building', startedAt: { lt: new Date(Date.now() - STALE_EXPORT_MS) } },
    data: { status: 'queued' },
  })
  await prisma.dataExportRun.updateMany({
    where: { status: 'queued', attempts: { gte: MAX_EXPORT_ATTEMPTS } },
    data: { status: 'failed', failedAt: new Date(), error: 'Export retry limit reached.' },
  })
  const queued = await prisma.dataExportRun.findMany({
    where: { status: 'queued', createdAt: { lt: new Date(Date.now() - 30_000) } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 2,
  })
  for (const row of queued) scheduleDataExport(row.id)

  const expired = await prisma.dataExportRun.findMany({
    where: { status: 'ready', expiresAt: { lte: new Date() } },
    select: { id: true, filePath: true },
    take: 50,
  })
  for (const row of expired) {
    if (row.filePath) {
      const absolute = path.resolve(process.cwd(), row.filePath)
      if (storageKeyForPath(absolute)) await deleteUpload(absolute).catch(() => undefined)
    }
    await prisma.dataExportRun.update({
      where: { id: row.id },
      data: { status: 'expired', filePath: null },
    })
  }

  const dueWebhooks = await prisma.dataExportRun.findMany({
    where: { webhookStatus: 'pending', webhookNextAttemptAt: { lte: new Date() } },
    select: { id: true },
    take: 20,
  })
  for (const row of dueWebhooks) await deliverDataExportWebhook(row.id)
  return { requeued: stale.count, started: queued.length, expired: expired.length, webhooks: dueWebhooks.length }
}
