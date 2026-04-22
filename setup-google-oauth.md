# 🚀 Google OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Select a project" → "New Project"
   - Project name: `Injury Intelligence OAuth`
   - Click "Create"

## Step 2: Enable Google+ API

1. **Go to APIs & Services**
   - In the left menu, click "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - Click "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Click "Create"

2. **Fill in App Information**
   - **App name**: `Injury Intelligence`
   - **User support email**: Your email
   - **App logo**: (Optional - you can skip)
   - **App domain**: Leave blank for now
   - **Developer contact information**: Your email
   - Click "Save and Continue"

3. **Add Scopes**
   - Click "Add or Remove Scopes"
   - Add these scopes:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile`
   - Click "Update" → "Save and Continue"

4. **Add Test Users (Optional)**
   - Add your email address as a test user
   - Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - Click "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"

2. **Configure OAuth Client**
   - **Application type**: Web application
   - **Name**: `Injury Intelligence Web Client`

3. **Add Authorized Redirect URIs**
   - Click "Add URI"
   - Add: `http://localhost:4000/v1/auth/google/callback`
   - Click "Create"

4. **Copy Credentials**
   - Copy the **Client ID** and **Client Secret**
   - Keep this window open - you'll need these values!

## Step 5: Configure Your Application

1. **Open your `.env` file** in `api/.env`

2. **Add Google OAuth credentials**:
   ```
   GOOGLE_CLIENT_ID="your-client-id-here"
   GOOGLE_CLIENT_SECRET="your-client-secret-here"
   GOOGLE_REDIRECT_URI="http://localhost:4000/v1/auth/google/callback"
   ```

3. **Save the file**

## Step 6: Test the Setup

1. **Restart the API server**:
   ```bash
   cd api
   $env:DATABASE_URL="file:./dev.db"
   $env:JWT_SECRET="your-super-secret-jwt-key-here"
   pnpm dev
   ```

2. **Test OAuth status**:
   - Visit: http://localhost:4000/v1/auth/status
   - You should see: `{"google":{"configured":true}}`

3. **Test Google Login**:
   - Go to: http://localhost:5174/login
   - Click "Continue with Google"
   - You should be redirected to Google's login page

## 🎉 Success!

If everything is configured correctly:
- ✅ Google OAuth status shows `configured: true`
- ✅ Clicking "Continue with Google" redirects to Google login
- ✅ After Google login, you'll be redirected back to your app
- ✅ User account will be created/linked automatically

## 🔧 Troubleshooting

### "Invalid client" error
- Check that Client ID and Client Secret are correct
- Make sure there are no extra spaces or quotes

### "Redirect URI mismatch" error
- Verify the redirect URI in Google Console matches exactly
- Should be: `http://localhost:4000/v1/auth/google/callback`

### "Access blocked" error
- Make sure your app is in "Testing" mode in OAuth consent screen
- Add your email as a test user

## 📞 Need Help?

If you run into issues:
1. Double-check all the steps above
2. Make sure your `.env` file has the correct format
3. Restart the API server after making changes
4. Check the browser console for detailed error messages
