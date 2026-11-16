import crypto from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { Prisma } from '@prisma/client'
import { buildApp } from './build-app'
import { generateToken } from './lib/auth'
import { prisma } from './lib/prisma'
import { runCaseRecalculation } from './lib/case-recalculation'
import { updateCaseFacts } from './lib/case-facts'

const qaUrl = process.env.LINEAGE_QA_DATABASE_URL || ''
const expectedDatabase = 'clearcaseiq_lineage_qa'
const qaEnabled =
  process.env.RUN_LINEAGE_POSTGRES_QA === 'true' &&
  (() => {
    try {
      return new URL(qaUrl).pathname.replace(/^\//, '') === expectedDatabase
    } catch {
      return false
    }
  })()

const describeQa = qaEnabled ? describe : describe.skip

describeQa('prediction lineage on dedicated QA PostgreSQL', () => {
  const app = buildApp()
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const userId = `qa-lineage-user-${suffix}`
  const attorneyId = `qa-lineage-attorney-${suffix}`
  const assessmentId = `qa-lineage-assessment-${suffix}`
  const leadId = `qa-lineage-lead-${suffix}`
  const userEmail = `qa-lineage-${suffix}@example.invalid`
  const attorneyEmail = `qa-lineage-attorney-${suffix}@example.invalid`
  let legacyPredictionCount = 0

  async function addBill(id: string, amount: number, summary: string) {
    return prisma.evidenceFile.create({
      data: {
        id,
        userId,
        assessmentId,
        originalName: `${id}.pdf`,
        filename: `${id}.pdf`,
        mimetype: 'application/pdf',
        size: 1024,
        filePath: `/qa/${id}.pdf`,
        fileUrl: `/uploads/qa/${id}.pdf`,
        category: 'bills',
        processingStatus: 'completed',
        ocrText: `${summary}. Itemized medical treatment charges total $${amount}.`,
        aiClassification: 'bills',
        aiSummary: summary,
        extractedData: {
          create: {
            totalAmount: amount,
            dollarAmounts: JSON.stringify([`$${amount}`]),
            dates: JSON.stringify(['2026-11-01']),
            confidence: 0.99,
          },
        },
      },
    })
  }

  beforeAll(async () => {
    const [{ current_database: database }] = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database()
    `
    expect(database).toBe(expectedDatabase)
    legacyPredictionCount = await prisma.prediction.count({
      where: {
        assessmentRevision: null,
        triggerEventId: null,
        inputHash: null,
        inputSnapshot: null,
      },
    })
    expect(legacyPredictionCount).toBeGreaterThan(0)

    await prisma.user.create({
      data: {
        id: userId,
        email: userEmail,
        firstName: 'QA',
        lastName: 'Plaintiff',
        role: 'client',
        isActive: true,
      },
    })
    await prisma.attorney.create({
      data: {
        id: attorneyId,
        name: 'QA Lineage Attorney',
        email: attorneyEmail,
        specialties: JSON.stringify(['auto']),
        venues: JSON.stringify(['CA']),
        isActive: true,
        isVerified: true,
      },
    })
    await prisma.assessment.create({
      data: {
        id: assessmentId,
        userId,
        claimType: 'auto',
        venueState: 'CA',
        venueCounty: 'Los Angeles',
        status: 'IN_PROGRESS',
        lastWriteSource: 'web',
        facts: JSON.stringify({
          incident: {
            date: '2026-10-01',
            narrative: 'The defendant rear-ended the plaintiff at a red light.',
          },
          injuries: [{ type: 'neck', description: 'Neck pain and headaches' }],
          damages: { med_charges: 5_000, intake_med_charges: 5_000 },
        }),
      },
    })
    await prisma.leadSubmission.create({
      data: {
        id: leadId,
        assessmentId,
        sourceType: 'plaintiff',
        assignedAttorneyId: attorneyId,
        assignmentType: 'direct',
      },
    })
  }, 30_000)

  afterAll(async () => {
    await prisma.attorneyCaseReview.deleteMany({ where: { caseId: assessmentId } })
    await prisma.prediction.deleteMany({ where: { assessmentId } })
    await prisma.leadSubmission.deleteMany({ where: { assessmentId } })
    await prisma.evidenceFile.deleteMany({ where: { assessmentId } })
    await prisma.assessment.deleteMany({ where: { id: assessmentId } })
    await prisma.attorney.deleteMany({ where: { id: attorneyId } })
    await prisma.user.deleteMany({ where: { email: attorneyEmail } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  }, 30_000)

  it('persists versions, feedback, concurrent recalculations, complete audits, and deletion protection', async () => {
    const plaintiffToken = generateToken(userId)
    const attorneyUser = await prisma.user.create({
      data: {
        email: attorneyEmail,
        firstName: 'QA',
        lastName: 'Attorney',
        role: 'attorney',
        isActive: true,
      },
    })
    const attorneyToken = generateToken(attorneyUser.id)

    await request(app)
      .post('/v1/predict')
      .set('Authorization', `Bearer ${plaintiffToken}`)
      .send({ assessmentId })
      .expect(200)

    await addBill(`qa-lineage-bill-1-${suffix}`, 20_000, 'Emergency treatment bill')
    expect(await runCaseRecalculation(assessmentId, 'document_upload')).not.toBeNull()

    let predictions = await prisma.prediction.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'asc' },
    })
    expect(predictions).toHaveLength(2)
    const reviewedPrediction = predictions[1]

    await request(app)
      .put(`/v1/attorney-dashboard/leads/${leadId}/prediction-review`)
      .set('Authorization', `Bearer ${attorneyToken}`)
      .send({
        predictionId: reviewedPrediction.id,
        liability: { disagrees: true, score: 85, notes: 'Rear-end liability is stronger.' },
        evidence: {
          disagrees: true,
          additions: ['Traffic camera footage'],
          removals: [],
          notes: 'Request the intersection recording.',
        },
        valuation: {
          disagrees: true,
          settlementLow: 30_000,
          settlementExpected: 50_000,
          settlementHigh: 75_000,
          notes: 'Documented treatment supports a higher range.',
        },
      })
      .expect(200)

    await addBill(`qa-lineage-bill-2-${suffix}`, 60_000, 'Specialist treatment and imaging')
    expect(await runCaseRecalculation(assessmentId, 'document_upload')).not.toBeNull()

    // Two evidence changes and recalculations race. Optimistic fact revisions
    // and the lineage uniqueness key must prevent a mismatched or duplicate row.
    await Promise.all([
      addBill(`qa-lineage-concurrent-a-${suffix}`, 3_000, 'Concurrent physical therapy bill'),
      addBill(`qa-lineage-concurrent-b-${suffix}`, 4_000, 'Concurrent imaging bill'),
    ])
    await Promise.all([
      runCaseRecalculation(assessmentId, 'concurrent_evidence_a'),
      runCaseRecalculation(assessmentId, 'concurrent_evidence_b'),
    ])

    predictions = await prisma.prediction.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'asc' },
    })
    expect(predictions.length).toBeGreaterThanOrEqual(4)
    for (const prediction of predictions) {
      expect(prediction.assessmentRevision).not.toBeNull()
      expect(prediction.triggerEventId).not.toBeNull()
      expect(prediction.inputSnapshot).not.toBeNull()
      expect(prediction.inputHash).toMatch(/^[a-f0-9]{64}$/)
      const snapshot = JSON.parse(prediction.inputSnapshot!)
      expect(snapshot.assessmentRevision).toBe(prediction.assessmentRevision)
      expect(snapshot.modelConfiguration.modelVersion).toBe(prediction.modelVersion)
      expect(crypto.createHash('sha256').update(prediction.inputSnapshot!).digest('hex')).toBe(
        prediction.inputHash,
      )
      const event = await prisma.caseChangeEvent.findUnique({
        where: { id: prediction.triggerEventId! },
      })
      expect(event?.assessmentId).toBe(assessmentId)
      expect(event?.revision).toBe(prediction.assessmentRevision)
    }
    const lineageKeys = predictions.map(
      (prediction) =>
        `${prediction.assessmentRevision}:${prediction.inputHash}:${prediction.modelVersion}`,
    )
    expect(new Set(lineageKeys).size).toBe(lineageKeys.length)

    const review = await prisma.attorneyCaseReview.findUnique({
      where: {
        attorneyId_predictionId: {
          attorneyId,
          predictionId: reviewedPrediction.id,
        },
      },
    })
    expect(review).toMatchObject({
      predictionId: reviewedPrediction.id,
      liabilityDisagrees: true,
      evidenceDisagrees: true,
      valuationDisagrees: true,
    })
    expect(
      await prisma.attorneyCaseReview.count({
        where: { attorneyId, predictionId: predictions.at(-1)!.id },
      }),
    ).toBe(0)

    const fields = Object.fromEntries(
      Array.from({ length: 55 }, (_, index) => [`field${index}`, index]),
    )
    await updateCaseFacts({
      assessmentId,
      source: 'system',
      action: 'qa_bulk_seed',
      actor: { type: 'system', id: 'qa-lineage' },
      mutate: (facts) => ({ ...facts, qaBulk: fields }),
    })
    const bulkUpdate = await updateCaseFacts({
      assessmentId,
      source: 'system',
      action: 'qa_bulk_update',
      actor: { type: 'system', id: 'qa-lineage' },
      mutate: (facts) => ({
        ...facts,
        qaBulk: Object.fromEntries(
          Object.entries(facts.qaBulk).map(([key, value]) => [key, Number(value) + 1]),
        ),
      }),
    })
    expect(bulkUpdate?.trackedChanges).toBe(55)
    expect(
      await prisma.caseFactChange.count({
        where: {
          assessmentId,
          revision: bulkUpdate!.revision!,
          action: 'qa_bulk_update',
          path: { startsWith: 'qaBulk.field' },
        },
      }),
    ).toBe(55)

    await expect(prisma.assessment.delete({ where: { id: assessmentId } })).rejects.toMatchObject({
      code: 'P2003',
    })
    await expect(
      prisma.prediction.delete({ where: { id: reviewedPrediction.id } }),
    ).rejects.toMatchObject({ code: 'P2003' })

    expect(
      await prisma.prediction.count({
        where: {
          assessmentRevision: null,
          triggerEventId: null,
          inputHash: null,
          inputSnapshot: null,
        },
      }),
    ).toBe(legacyPredictionCount)

    // The unique key must be enforced by PostgreSQL, not only application code.
    const latest = predictions.at(-1)!
    await expect(
      prisma.prediction.create({
        data: {
          assessmentId,
          modelVersion: latest.modelVersion,
          viability: latest.viability,
          bands: latest.bands,
          explain: latest.explain,
          assessmentRevision: latest.assessmentRevision,
          triggerEventId: latest.triggerEventId,
          inputHash: latest.inputHash,
          inputSnapshot: latest.inputSnapshot,
        },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError)

    // The explicit erasure/rollback order remains compatible with restrictive
    // foreign keys: opinions, then predictions, then the assessment.
    const disposableAssessmentId = `qa-lineage-disposable-${suffix}`
    await prisma.assessment.create({
      data: {
        id: disposableAssessmentId,
        userId,
        claimType: 'auto',
        venueState: 'CA',
        facts: '{}',
      },
    })
    const disposableEvent = await prisma.caseChangeEvent.create({
      data: {
        assessmentId: disposableAssessmentId,
        revision: 0,
        source: 'system',
        actorType: 'system',
        action: 'prediction_initial',
        entityType: 'prediction',
      },
    })
    const disposableSnapshot = JSON.stringify({
      schemaVersion: 1,
      assessmentRevision: 0,
      heuristicFeatures: null,
      underwritingInput: null,
      modelConfiguration: {
        modelVersion: 'qa-model-v1',
        inferenceSource: 'qa',
        calibrationVersion: null,
      },
    })
    const disposablePrediction = await prisma.prediction.create({
      data: {
        assessmentId: disposableAssessmentId,
        modelVersion: 'qa-model-v1',
        viability: '{}',
        bands: '{}',
        explain: '{}',
        assessmentRevision: 0,
        triggerEventId: disposableEvent.id,
        inputSnapshot: disposableSnapshot,
        inputHash: crypto.createHash('sha256').update(disposableSnapshot).digest('hex'),
      },
    })
    await prisma.attorneyCaseReview.create({
      data: {
        attorneyId,
        caseId: disposableAssessmentId,
        predictionId: disposablePrediction.id,
        acceptCase: true,
      },
    })
    await prisma.$transaction(async (tx) => {
      await tx.attorneyCaseReview.deleteMany({ where: { caseId: disposableAssessmentId } })
      await tx.prediction.deleteMany({ where: { assessmentId: disposableAssessmentId } })
      await tx.assessment.delete({ where: { id: disposableAssessmentId } })
    })
    expect(await prisma.assessment.count({ where: { id: disposableAssessmentId } })).toBe(0)

    await prisma.user.delete({ where: { id: attorneyUser.id } })
  }, 60_000)
})
