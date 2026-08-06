import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const attorneys = await (prisma as any).attorney.findMany({
    where: { email: { contains: 'edison' } },
    select: { id: true, name: true, email: true, userId: true },
  })
  console.log('Local attorneys with "edison":', attorneys)

  const users = await (prisma as any).user.findMany({
    where: { email: { contains: 'edison' } },
    select: { id: true, email: true, role: true, isActive: true, provider: true },
  })
  console.log('Local users with "edison":', users)

  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
