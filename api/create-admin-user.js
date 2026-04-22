import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    const adminEmail = 'admin@caseiq.com'
    const adminPassword = 'admin123'

    console.log('🔐 Creating Admin User')
    console.log('======================\n')

    // Check if admin user already exists
    let user = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (user) {
      console.log(`✅ Admin user already exists: ${adminEmail}`)
      console.log(`   Name: ${user.firstName} ${user.lastName}`)
      
      // Update password to ensure it's set
      const passwordHash = await bcrypt.hash(adminPassword, 12)
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, isActive: true }
      })
      console.log(`✅ Password updated`)
    } else {
      // Create admin user
      const passwordHash = await bcrypt.hash(adminPassword, 12)
      user = await prisma.user.create({
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
      console.log(`✅ Created admin user: ${adminEmail}`)
    }

    console.log('\n🎯 Admin Login Credentials:')
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)
    console.log('\n📝 To access the admin page:')
    console.log('   1. Log in at http://localhost:5173/login')
    console.log('   2. Navigate to http://localhost:5173/admin')
    console.log('\n💡 Note: Make sure ADMIN_EMAILS environment variable includes this email,')
    console.log('   or it will default to admin@caseiq.com')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
