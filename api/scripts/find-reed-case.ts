import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env'), override: false })
const prisma = new PrismaClient()

async function main() {
  const sarah = await prisma.attorney.findFirst({
    where: { name: { contains: 'Sarah Johnson', mode: 'insensitive' } },
    select: { id: true, name: true, email: true },
  })
  console.log('attorney', sarah)

  const assessments = await prisma.assessment.findMany({
    where: {
      OR: [
        { caseName: { contains: 'reed', mode: 'insensitive' } },
        { caseName: { contains: 'reed v', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      caseName: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      leadSubmission: {
        select: {
          id: true,
          status: true,
          assignedAttorneyId: true,
          assignedAttorney: { select: { name: true } },
        },
      },
    },
    take: 30,
    orderBy: { updatedAt: 'desc' },
  })
  console.log(JSON.stringify(assessments, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
