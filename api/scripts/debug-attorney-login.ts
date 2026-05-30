import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

config({ path: resolve(__dirname, '../.env'), override: false })

const prisma = new PrismaClient()
const email = (process.argv[2] || 'sarah.johnson@lawfirm.com').trim().toLowerCase()
const password = process.argv[3] || 'password123'

async function main() {
  const user = await prisma.user.findUnique({ where: { email } })
  console.log('user', user ? { id: user.id, email: user.email, isActive: user.isActive, hasHash: !!user.passwordHash } : null)

  if (user?.passwordHash) {
    console.log('passwordMatch', await bcrypt.compare(password, user.passwordHash))
  }

  const attorneys = await prisma.attorney.findMany({ where: { email } })
  console.log('attorneyCount', attorneys.length)
  for (const a of attorneys) {
    let specialtiesOk = true
    let venuesOk = true
    try {
      JSON.parse(a.specialties || '[]')
    } catch {
      specialtiesOk = false
    }
    try {
      JSON.parse(a.venues || '[]')
    } catch {
      venuesOk = false
    }
    console.log({
      id: a.id,
      email: a.email,
      specialtiesOk,
      venuesOk,
      specialtiesPreview: String(a.specialties).slice(0, 60),
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
