import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkPassword() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (!user) {
      console.log('❌ User test@example.com not found')
      return
    }

    console.log('✅ User found: test@example.com')
    console.log(`   Name: ${user.firstName} ${user.lastName}`)
    
    if (!user.passwordHash) {
      console.log('⚠️  No password set. Setting default password...')
      const hashedPassword = await bcrypt.hash('password123', 12)
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword }
      })
      console.log('✅ Password set to: password123')
    } else {
      // Test if password123 works
      const testPassword = 'password123'
      const isValid = await bcrypt.compare(testPassword, user.passwordHash)
      
      if (isValid) {
        console.log('✅ Password is: password123')
      } else {
        console.log('⚠️  Password is NOT "password123"')
        console.log('   Resetting to default password...')
        const hashedPassword = await bcrypt.hash('password123', 12)
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashedPassword }
        })
        console.log('✅ Password reset to: password123')
      }
    }

    console.log('\n🎯 Login credentials:')
    console.log('   Email: test@example.com')
    console.log('   Password: password123')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkPassword()
