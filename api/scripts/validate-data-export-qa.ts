import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

let prisma: import('@prisma/client').PrismaClient | null = null

async function main() {
  // `env.ts` intentionally loads api/.env for local app runs. Preserve the
  // operator-selected QA URL across that import and restore it before Prisma
  // opens its first connection.
  const targetDatabaseUrl = process.env.QA_DATABASE_URL || process.env.DATABASE_URL || ''
  const jobs = await import('../src/lib/data-export-jobs')
  prisma = (await import('../src/lib/prisma')).prisma
  process.env.DATABASE_URL = targetDatabaseUrl
  const { runDataExport, sweepDataExports } = jobs
  const deployEnv = String(process.env.DEPLOY_ENV || '').toLowerCase()
  const databaseUrl = new URL(targetDatabaseUrl)
  const database = databaseUrl.pathname.slice(1)
  if (deployEnv !== 'qa' || !database.toLowerCase().includes('qa')) {
    throw new Error(`Refusing export validation outside a dedicated QA database (env=${deployEnv}, db=${database})`)
  }

  const token = crypto.randomBytes(6).toString('hex')
  const firm = await prisma.lawFirm.create({
    data: { name: `Export QA ${token}`, slug: `export-qa-${token}`, isPublic: false },
  })
  const actor = await prisma.user.create({
    data: {
      email: `export-qa-${token}@example.test`,
      firstName: 'Export',
      lastName: 'Validator',
      role: 'attorney',
      emailVerified: true,
    },
  })
  const attorney = await prisma.attorney.create({
    data: {
      name: 'Export Validator',
      email: actor.email,
      specialties: '["personal_injury"]',
      venues: '["CA"]',
      lawFirmId: firm.id,
    },
  })
  await prisma.firmMember.create({
    data: {
      lawFirmId: firm.id,
      userId: actor.id,
      attorneyId: attorney.id,
      role: 'firm_admin',
      status: 'active',
    },
  })
  const runIds: string[] = []
  const fixtureDirectory = path.resolve(process.cwd(), 'uploads', 'export-qa', token)
  try {
    const cases = await Promise.all(
      Array.from({ length: 120 }, (_, index) =>
        prisma.assessment.create({
          data: {
            lawFirmId: firm.id,
            claimType: index % 2 ? 'auto_accident' : 'premises_liability',
            venueState: 'CA',
            facts: JSON.stringify({ synthetic: true, index }),
          },
          select: { id: true },
        }),
      ),
    )
    await Promise.all(cases.slice(0, 12).map((record, index) =>
      prisma.caseChangeEvent.create({
        data: {
          assessmentId: record.id,
          lawFirmId: firm.id,
          revision: 1,
          source: 'system',
          action: 'qa_fixture_created',
          entityType: 'assessment',
          entityId: record.id,
          summary: `Synthetic QA event ${index}`,
        },
      }),
    ))
    await prisma.ethicalWall.create({
      data: {
        assessmentId: cases[0].id,
        blockedAttorneyId: attorney.id,
        reason: 'Synthetic QA ethical wall',
      },
    })
    await prisma.consent.create({
      data: {
        userId: actor.id,
        assessmentId: cases[1].id,
        consentType: 'attorney_share',
        version: 'qa-1',
        documentId: 'qa-attorney-share',
        granted: false,
        revokedAt: new Date(),
        consentText: 'Synthetic revoked attorney-share consent',
        consentHash: crypto.createHash('sha256').update('qa-attorney-share').digest('hex'),
      },
    })
    await prisma.consent.create({
      data: {
        userId: actor.id,
        assessmentId: cases[2].id,
        consentType: 'hipaa',
        version: 'qa-1',
        documentId: 'qa-hipaa',
        granted: false,
        revokedAt: new Date(),
        consentText: 'Synthetic revoked HIPAA consent',
        consentHash: crypto.createHash('sha256').update('qa-hipaa').digest('hex'),
      },
    })
    await fs.promises.mkdir(fixtureDirectory, { recursive: true })
    const hipaaFile = path.join(fixtureDirectory, 'revoked-medical.txt')
    const regularFile = path.join(fixtureDirectory, 'permitted-photo.txt')
    await fs.promises.writeFile(hipaaFile, 'synthetic medical record')
    await fs.promises.writeFile(regularFile, 'synthetic evidence photo')
    await prisma.evidenceFile.createMany({
      data: [
        {
          userId: actor.id,
          assessmentId: cases[2].id,
          originalName: 'revoked-medical.txt',
          filename: 'revoked-medical.txt',
          mimetype: 'text/plain',
          size: 24,
          filePath: path.relative(process.cwd(), hipaaFile),
          fileUrl: '/uploads/export-qa/revoked-medical.txt',
          category: 'medical_records',
          isHIPAA: true,
        },
        {
          userId: actor.id,
          assessmentId: cases[3].id,
          originalName: 'permitted-photo.txt',
          filename: 'permitted-photo.txt',
          mimetype: 'text/plain',
          size: 24,
          filePath: path.relative(process.cwd(), regularFile),
          fileUrl: '/uploads/export-qa/permitted-photo.txt',
          category: 'photos',
          isHIPAA: false,
        },
      ],
    })

    const snapshot = await prisma.dataExportRun.create({
      data: { lawFirmId: firm.id, kind: 'snapshot', requestedByUserId: actor.id },
    })
    runIds.push(snapshot.id)
    await runDataExport(snapshot.id)
    const persistedSnapshot = await prisma.dataExportRun.findUniqueOrThrow({
      where: { id: snapshot.id },
      include: { artifacts: true },
    })
    if (persistedSnapshot.status !== 'ready' || !persistedSnapshot.filePath || !persistedSnapshot.contentHash) {
      throw new Error('Snapshot export did not persist a ready artifact')
    }
    const reconciliation = JSON.parse(persistedSnapshot.reconciliation || '{}')
    if (reconciliation.database_rows !== reconciliation.written_rows) {
      throw new Error('Snapshot row reconciliation failed')
    }
    const archive = path.resolve(process.cwd(), persistedSnapshot.filePath)
    if (!fs.existsSync(archive) || fs.statSync(archive).size !== persistedSnapshot.fileSize) {
      throw new Error('Snapshot ZIP size does not match its persisted ledger')
    }
    const snapshotCounts = JSON.parse(persistedSnapshot.rowCounts || '{}')
    if (snapshotCounts['cases.jsonl'] !== 118 || snapshotCounts['evidence_files.jsonl'] !== 1) {
      throw new Error(
        `Policy filters failed: cases=${snapshotCounts['cases.jsonl']} evidence=${snapshotCounts['evidence_files.jsonl']}`,
      )
    }
    if (persistedSnapshot.artifacts.filter((row) => row.kind === 'evidence').length !== 1) {
      throw new Error('Evidence binaries were not filtered consistently with metadata')
    }

    const incremental = await prisma.dataExportRun.create({
      data: { lawFirmId: firm.id, kind: 'incremental', sinceCursor: 0, requestedByUserId: actor.id },
    })
    runIds.push(incremental.id)
    await runDataExport(incremental.id)
    const persistedIncremental = await prisma.dataExportRun.findUniqueOrThrow({
      where: { id: incremental.id },
      include: { artifacts: true },
    })
    const counts = JSON.parse(persistedIncremental.rowCounts || '{}')
    if (persistedIncremental.status !== 'ready' || counts['cases.jsonl'] !== 10) {
      throw new Error(`Incremental export expected 10 authorized changed cases, got ${counts['cases.jsonl']}`)
    }

    await prisma.dataExportRun.update({
      where: { id: incremental.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })
    await sweepDataExports()
    const expired = await prisma.dataExportRun.findUniqueOrThrow({ where: { id: incremental.id } })
    if (expired.status !== 'expired' || expired.filePath !== null) {
      throw new Error('Expired artifact was not protected from further downloads')
    }

    const stale = await prisma.dataExportRun.create({
      data: {
        lawFirmId: firm.id,
        kind: 'snapshot',
        status: 'building',
        attempts: 3,
        startedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    })
    runIds.push(stale.id)
    const recovered = await sweepDataExports()
    const terminal = await prisma.dataExportRun.findUniqueOrThrow({ where: { id: stale.id } })
    if (recovered.requeued !== 1 || terminal.status !== 'failed') {
      throw new Error('Stale export recovery did not enforce the bounded retry limit')
    }

    console.log(JSON.stringify({
      database,
      snapshot: {
        status: persistedSnapshot.status,
        artifacts: persistedSnapshot.artifacts.length,
        cases: snapshotCounts['cases.jsonl'],
        evidence: snapshotCounts['evidence_files.jsonl'],
        sha256: persistedSnapshot.contentHash,
      },
      incremental: {
        status: persistedIncremental.status,
        cases: counts['cases.jsonl'],
        cutoffCursor: persistedIncremental.cutoffCursor,
      },
      expiry: expired.status,
      staleRecovery: terminal.status,
    }, null, 2))
  } finally {
    for (const id of runIds) {
      const run = await prisma.dataExportRun.findUnique({ where: { id }, select: { filePath: true } })
      if (run?.filePath) await fs.promises.rm(path.resolve(process.cwd(), run.filePath), { force: true })
    }
    await prisma.dataExportRun.deleteMany({ where: { lawFirmId: firm.id } })
    await prisma.assessment.deleteMany({ where: { lawFirmId: firm.id } })
    await prisma.attorney.delete({ where: { id: attorney.id } })
    await prisma.lawFirm.delete({ where: { id: firm.id } })
    await prisma.user.delete({ where: { id: actor.id } })
    await fs.promises.rm(fixtureDirectory, { recursive: true, force: true })
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma?.$disconnect())
