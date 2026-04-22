// Simple OAuth test without building
console.log('🔐 OAuth Configuration Test')
console.log('==========================')

// Check environment variables
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const appleClientId = process.env.APPLE_CLIENT_ID
const appleTeamId = process.env.APPLE_TEAM_ID

console.log('\n📊 Google OAuth:')
console.log(`  Client ID: ${googleClientId ? '✅ Set' : '❌ Not set'}`)
console.log(`  Client Secret: ${googleClientSecret ? '✅ Set' : '❌ Not set'}`)

console.log('\n🍎 Apple OAuth:')
console.log(`  Client ID: ${appleClientId ? '✅ Set' : '❌ Not set'}`)
console.log(`  Team ID: ${appleTeamId ? '✅ Set' : '❌ Not set'}`)

console.log('\n🌐 Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:5173')

console.log('\n🚀 OAuth Status:')
const googleConfigured = !!(googleClientId && googleClientSecret)
const appleConfigured = !!(appleClientId && appleTeamId)

console.log(`  Google: ${googleConfigured ? '✅ Ready' : '❌ Not configured'}`)
console.log(`  Apple: ${appleConfigured ? '✅ Ready' : '❌ Not configured'}`)

if (!googleConfigured && !appleConfigured) {
  console.log('\n⚠️  No OAuth providers configured. Users can still login with email/password.')
  console.log('   Email: test@example.com')
  console.log('   Password: password123')
  console.log('\n📝 To set up OAuth:')
  console.log('1. Follow the OAUTH_SETUP.md guide')
  console.log('2. Add the required environment variables to your .env file')
  console.log('3. Restart the API server')
  console.log('4. Test the OAuth login buttons on the login/register pages')
} else {
  console.log('\n🎉 OAuth is configured! You can now test the login buttons.')
}

console.log('\n🔗 Test URLs:')
console.log('  Google OAuth: http://localhost:4000/v1/auth/google')
console.log('  Apple OAuth: http://localhost:4000/v1/auth/apple')
console.log('  OAuth Status: http://localhost:4000/v1/auth/status')
