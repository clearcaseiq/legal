import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('./lib/prisma', () => import('./test/universalPrismaMock'))

const { ensureCaseOwnerUserId } = vi.hoisted(() => ({
  ensureCaseOwnerUserId: vi.fn(),
}))
vi.mock('./lib/case-owner', () => ({ ensureCaseOwnerUserId }))

import { buildApp } from './build-app'
import { generateToken } from './lib/auth'
import { prisma } from './lib/prisma'
import { resetUniversalPrismaMock } from './test/universalPrismaMock'

const app = buildApp()
const attacker = {
  id: 'attacker-1',
  email: 'attacker@example.com',
  role: 'client',
  isActive: true,
}

describe('POST /v1/evidence/upload-multiple authorization', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    ensureCaseOwnerUserId.mockReset()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(attacker as any)
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
      id: 'assessment-1',
      userId: 'owner-1',
      lawFirmId: null,
      user: { email: 'owner@example.com' },
      leadSubmission: null,
    } as any)
    vi.mocked(prisma.attorney.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.firmMember.findMany).mockResolvedValue([] as any)
  })

  it('rejects before owner resolution and removes every multer file', async () => {
    const marker = `rejected-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const uploadDir = path.join(process.cwd(), 'uploads', 'evidence')

    const res = await request(app)
      .post('/v1/evidence/upload-multiple')
      .set('Authorization', `Bearer ${generateToken(attacker.id)}`)
      .field('assessmentId', 'assessment-1')
      .attach('files', Buffer.from('first'), `${marker}-1.txt`)
      .attach('files', Buffer.from('second'), `${marker}-2.txt`)

    expect(res.status).toBe(403)
    expect(ensureCaseOwnerUserId).not.toHaveBeenCalled()
    expect(prisma.evidenceFile.create).not.toHaveBeenCalled()

    const leftovers = fs.existsSync(uploadDir)
      ? fs.readdirSync(uploadDir).filter((name) => name.includes(marker))
      : []
    expect(leftovers).toEqual([])
  })
})
