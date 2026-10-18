import os from 'os'
import path from 'path'
import fs from 'fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'))

const db = vi.hoisted(() => ({
  pkg: null as any,
  letter: null as any,
}))

vi.mock('./prisma', () => ({
  prisma: {
    demandPackage: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (where.id && db.pkg?.id === where.id && db.pkg.status === where.status) {
          db.pkg = { ...db.pkg, ...data, attempts: db.pkg.attempts + (data.attempts?.increment ?? 0) }
          return { count: 1 }
        }
        return { count: 0 }
      }),
      findUnique: vi.fn(async () => db.pkg),
      update: vi.fn(async ({ data }: any) => (db.pkg = { ...db.pkg, ...data })),
    },
    demandLetter: { findUnique: vi.fn(async () => db.letter) },
    leadSubmission: { findFirst: vi.fn(async () => ({ id: 'lead1' })) },
  },
}))
vi.mock('./object-storage', () => ({
  uploadsRoot: () => tmp,
  persistUpload: vi.fn(async () => undefined),
  ensureLocalCopy: vi.fn(async () => true),
}))
const notify = vi.fn(async () => true)
vi.mock('./case-notifications', () => ({ notifyAttorneyInApp: (...a: any[]) => notify(...(a as [])) }))
const build = vi.fn()
vi.mock('./demand-pdf-package', async (orig) => ({
  ...(await orig<typeof import('./demand-pdf-package')>()),
  buildDemandPackagePdf: (...a: any[]) => build(...a),
}))

import { MAX_BUILD_ATTEMPTS, packageView, runDemandPackage } from './demand-package-jobs'

beforeEach(() => {
  build.mockReset()
  notify.mockClear()
  db.pkg = {
    id: 'p1',
    demandLetterId: 'd1',
    assessmentId: 'a1',
    status: 'queued',
    attempts: 0,
    config: JSON.stringify({ exhibits: [{ key: 'ex:1', include: true }], bates: { prefix: 'DOE', start: 5 } }),
    requestedByAttorneyId: 'att1',
    requestedById: 'u1',
  }
  db.letter = { id: 'd1', assessmentId: 'a1', content: 'Letter', template: 'super', status: 'FINAL', title: null, currentVersion: 3 }
})

describe('runDemandPackage', () => {
  it('builds with the saved selection and Bates settings, stores the file, and notifies', async () => {
    build.mockResolvedValue({ bytes: new Uint8Array([1, 2, 3]), pageCount: 12, batesEnd: 16, exhibitCount: 1 })
    await runDemandPackage('p1')

    expect(build).toHaveBeenCalledWith(db.letter, {
      selection: [{ key: 'ex:1', include: true }],
      bates: { prefix: 'DOE', start: 5 },
    })
    expect(db.pkg).toMatchObject({ status: 'ready', pageCount: 12, batesStart: 5, batesEnd: 16, letterVersion: 3, draft: false, fileSize: 3 })
    expect(fs.existsSync(path.resolve(process.cwd(), db.pkg.filePath))).toBe(true)
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ attorneyId: 'att1', link: '/attorney-dashboard/lead/lead1/demand' }))
  })

  it('does nothing when another worker already claimed the build', async () => {
    db.pkg.status = 'building'
    await runDemandPackage('p1')
    expect(build).not.toHaveBeenCalled()
  })

  it('requeues a failed build until the attempt limit, then marks it failed', async () => {
    build.mockRejectedValue(new Error('boom'))
    for (let i = 1; i < MAX_BUILD_ATTEMPTS; i++) {
      await runDemandPackage('p1')
      expect(db.pkg.status).toBe('queued')
    }
    await runDemandPackage('p1')
    expect(db.pkg.status).toBe('failed')
    expect(db.pkg.error).toMatch(/could not be built/)
  })
})

describe('packageView', () => {
  it('flags a package built from an earlier letter version as stale', () => {
    const view = packageView({ ...db.pkg, status: 'ready', letterVersion: 2, createdAt: new Date() }, 3)
    expect(view.stale).toBe(true)
    expect(packageView({ ...db.pkg, status: 'ready', letterVersion: 3, createdAt: new Date() }, 3).stale).toBe(false)
  })
})
