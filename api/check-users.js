import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true
      }
    })
    
    console.log(`📊 Found ${users.length} users:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.firstName} ${user.lastName}) - Active: ${user.isActive} - Created: ${user.createdAt}`)
    })
    
    if (users.length === 0) {
      console.log('\n❌ No users found in database!')
      console.log('💡 You need to register a new account first.')
    } else {
      console.log('\n✅ Users found. You can try logging in with any of these emails.')
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
