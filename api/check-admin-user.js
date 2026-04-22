import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkAdminUser() {
  try {
    const adminEmail = 'admin@caseiq.com'
    const adminPassword = 'admin123'

    console.log('🔍 Checking Admin User')
    console.log('======================\n')

    const user = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!user) {
      console.log('❌ Admin user NOT FOUND')
      console.log('   Creating admin user...')
      
      const passwordHash = await bcrypt.hash(adminPassword, 12)
      const newUser = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          phone: '(555) 000-0000',
          isActive: true,
          emailVerified: true
        }
      })
      console.log('✅ Created admin user:', newUser.email)
    } else {
      console.log('✅ Admin user EXISTS')
      console.log(`   Name: ${user.firstName} ${user.lastName}`)
      console.log(`   Active: ${user.isActive}`)
      console.log(`   Email Verified: ${user.emailVerified}`)
      
      // Test password
      if (user.passwordHash) {
        const isValid = await bcrypt.compare(adminPassword, user.passwordHash)
        if (isValid) {
          console.log('✅ Password is correct: admin123')
        } else {
          console.log('⚠️  Password is NOT "admin123"')
          console.log('   Resetting password...')
          const passwordHash = await bcrypt.hash(adminPassword, 12)
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, isActive: true }
          })
          console.log('✅ Password reset to: admin123')
        }
      } else {
        console.log('⚠️  No password set')
        const passwordHash = await bcrypt.hash(adminPassword, 12)
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash, isActive: true }
        })
        console.log('✅ Password set to: admin123')
      }
    }

    console.log('\n🎯 Login Credentials:')
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminUser()
