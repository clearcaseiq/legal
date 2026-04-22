# ChatGPT Setup Script
Write-Host "=== ChatGPT Configuration Setup ===" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
$envPath = "apps\api\.env"
if (Test-Path $envPath) {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
} else {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    
    # Create .env file with basic configuration
    $envContent = @"
DATABASE_URL=file:./dev.db
PORT=4000
FILE_BUCKET=local
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# OpenAI API Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key-here
"@
    
    $envContent | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host "✅ .env file created" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔑 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Get your OpenAI API key from: https://platform.openai.com/api-keys" -ForegroundColor White
Write-Host "2. Open the file: apps\api\.env" -ForegroundColor White
Write-Host "3. Replace 'your-openai-api-key-here' with your actual API key" -ForegroundColor White
Write-Host "4. Restart the API server" -ForegroundColor White
Write-Host ""
Write-Host "Example API key format: sk-1234567890abcdef..." -ForegroundColor Yellow
