# Build Vite web app and deploy to S3 + CloudFront
# Run from repo root: .\deploy\aws\deploy-web.ps1 -ApiUrl https://your-api-url
# The ApiUrl is baked into the build via VITE_API_URL

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl,
    
    [string]$Region = "us-east-1",
    [string]$Bucket = ""
)

$ErrorActionPreference = "Stop"

$AccountId = aws sts get-caller-identity --query Account --output text
if (-not $Bucket) {
    $Bucket = "legal-web-$AccountId"
}

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $RepoRoot

Write-Host "=== Deploy Web to S3 ===" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl"
Write-Host "Bucket: $Bucket`n"

# Build with API URL
$env:VITE_API_URL = $ApiUrl.TrimEnd('/')
Write-Host "Building web app (VITE_API_URL=$env:VITE_API_URL)..." -ForegroundColor Yellow
pnpm install
pnpm exec turbo run build --filter=caseiq-web

$DistPath = Join-Path $RepoRoot "apps\web\dist"
if (-not (Test-Path $DistPath)) {
    Write-Error "Build failed - dist folder not found at $DistPath"
}

# Sync to S3
Write-Host "`nSyncing to S3..." -ForegroundColor Yellow
aws s3 sync $DistPath "s3://$Bucket" --delete

# Set cache headers for static assets (optional)
# aws s3 cp "s3://$Bucket" "s3://$Bucket" --recursive --metadata-directive REPLACE --cache-control "max-age=31536000,public" --exclude "index.html" --exclude "*.json"

Write-Host "`nDone! Web app deployed to s3://$Bucket" -ForegroundColor Green
Write-Host "`nWebsite URL (if static hosting enabled):"
Write-Host "  http://$Bucket.s3-website-$Region.amazonaws.com"
Write-Host "`nFor production, create a CloudFront distribution pointing to this bucket."
