/**
 * Reset password for an attorney/user by email.
 * Usage: pnpm run reset:password <email> <newPassword>
 * Example: pnpm run reset:password cook@lawfirm.com MyNewPassword123
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env'), override: true })

const prisma = new PrismaClient()

async function main() {
  const [email, newPassword] = process.argv.slice(2)
  if (!email || !newPassword) {
    console.error('Usage: npx ts-node scripts/reset-attorney-password.ts <email> <newPassword>')
    process.exit(1)
  }

  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (user) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash }
    })
    console.log(`Password reset successfully for ${email}`)
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'Attorney',
        lastName: 'Cook',
        role: 'attorney',
        isActive: true,
        emailVerified: false
      }
    })
    console.log(`Created user account for ${email} with password set`)
  }
  console.log(`Password: ${newPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
