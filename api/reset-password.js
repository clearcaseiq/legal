import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetPassword() {
  try {
    console.log('🔐 Password Reset Utility')
    console.log('========================')
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    })
    
    console.log('\n📊 Available users:')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.firstName} ${user.lastName})`)
    })
    
    // For now, let's reset the password for the first user as an example
    // You can modify this to reset any user's password
    if (users.length > 0) {
      const userToReset = users[0] // Change this index to reset different users
      const newPassword = 'password123' // Simple password for testing
      
      console.log(`\n🔄 Resetting password for: ${userToReset.email}`)
      console.log(`📝 New password: ${newPassword}`)
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      
      // Update the user's password
      await prisma.user.update({
        where: { id: userToReset.id },
        data: { passwordHash: hashedPassword }
      })
      
      console.log('✅ Password reset successful!')
      console.log(`\n🎯 Login credentials:`)
      console.log(`   Email: ${userToReset.email}`)
      console.log(`   Password: ${newPassword}`)
      
    } else {
      console.log('❌ No users found to reset password for.')
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

resetPassword()
