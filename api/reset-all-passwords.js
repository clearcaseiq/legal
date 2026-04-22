import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetAllPasswords() {
  try {
    console.log('🔐 Reset All Passwords Utility')
    console.log('==============================')
    
    const defaultPassword = 'password123'
    console.log(`📝 Setting all passwords to: ${defaultPassword}`)
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    })
    
    console.log(`\n📊 Found ${users.length} users to reset:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.firstName} ${user.lastName})`)
    })
    
    // Hash the default password once
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)
    
    // Reset all passwords
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword }
      })
      console.log(`✅ Reset password for: ${user.email}`)
    }
    
    console.log('\n🎉 All passwords reset successfully!')
    console.log('\n🎯 Login credentials for all users:')
    console.log(`   Password: ${defaultPassword}`)
    console.log('\n📧 Available emails:')
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`)
    })
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

resetAllPasswords()
