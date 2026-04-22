import { oauthConfig } from './dist/config/oauth.js'

console.log('🔐 OAuth Configuration Test')
console.log('==========================')

console.log('\n📊 Google OAuth:')
console.log(`  Client ID: ${oauthConfig.google.clientId ? '✅ Set' : '❌ Not set'}`)
console.log(`  Client Secret: ${oauthConfig.google.clientSecret ? '✅ Set' : '❌ Not set'}`)
console.log(`  Redirect URI: ${oauthConfig.google.redirectUri}`)

console.log('\n🍎 Apple OAuth:')
console.log(`  Client ID: ${oauthConfig.apple.clientId ? '✅ Set' : '❌ Not set'}`)
console.log(`  Team ID: ${oauthConfig.apple.teamId ? '✅ Set' : '❌ Not set'}`)
console.log(`  Key ID: ${oauthConfig.apple.keyId ? '✅ Set' : '❌ Not set'}`)
console.log(`  Private Key: ${oauthConfig.apple.privateKey ? '✅ Set' : '❌ Not set'}`)
console.log(`  Redirect URI: ${oauthConfig.apple.redirectUri}`)

console.log('\n🌐 Frontend URL:', oauthConfig.frontendUrl)

console.log('\n📝 To set up OAuth:')
console.log('1. Follow the OAUTH_SETUP.md guide')
console.log('2. Add the required environment variables to your .env file')
console.log('3. Restart the API server')
console.log('4. Test the OAuth login buttons on the login/register pages')

console.log('\n🚀 OAuth Status:')
const googleConfigured = !!(oauthConfig.google.clientId && oauthConfig.google.clientSecret)
const appleConfigured = !!(oauthConfig.apple.clientId && oauthConfig.apple.teamId && oauthConfig.apple.keyId && oauthConfig.apple.privateKey)

console.log(`  Google: ${googleConfigured ? '✅ Ready' : '❌ Not configured'}`)
console.log(`  Apple: ${appleConfigured ? '✅ Ready' : '❌ Not configured'}`)

if (!googleConfigured && !appleConfigured) {
  console.log('\n⚠️  No OAuth providers configured. Users can still login with email/password.')
  console.log('   Email: test@example.com')
  console.log('   Password: password123')
}
