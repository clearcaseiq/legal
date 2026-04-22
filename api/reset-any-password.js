import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import readline from 'readline'

const prisma = new PrismaClient()

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

async function resetAnyPassword() {
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
    
    if (users.length === 0) {
      console.log('❌ No users found.')
      return
    }
    
    // Ask user which account to reset
    const choice = await askQuestion('\n🔢 Enter the number of the user to reset (1-' + users.length + '): ')
    const userIndex = parseInt(choice) - 1
    
    if (userIndex < 0 || userIndex >= users.length) {
      console.log('❌ Invalid choice.')
      return
    }
    
    const userToReset = users[userIndex]
    const newPassword = await askQuestion(`\n🔑 Enter new password for ${userToReset.email}: `)
    
    if (!newPassword.trim()) {
      console.log('❌ Password cannot be empty.')
      return
    }
    
    console.log(`\n🔄 Resetting password for: ${userToReset.email}`)
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10)
    
    // Update the user's password
    await prisma.user.update({
      where: { id: userToReset.id },
      data: { passwordHash: hashedPassword }
    })
    
    console.log('✅ Password reset successful!')
    console.log(`\n🎯 Login credentials:`)
    console.log(`   Email: ${userToReset.email}`)
    console.log(`   Password: ${newPassword.trim()}`)
    
    // Ask if user wants to reset another password
    const resetAnother = await askQuestion('\n🔄 Reset another password? (y/n): ')
    if (resetAnother.toLowerCase() === 'y' || resetAnother.toLowerCase() === 'yes') {
      await resetAnyPassword()
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

resetAnyPassword()
