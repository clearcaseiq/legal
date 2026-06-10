# ClearCaseIQ setup for Windows (PowerShell)
# See docs/WINDOWS_SETUP.md for full troubleshooting.

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Write-Host "Setting up ClearCaseIQ..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is not installed. Install Node 18+ first."
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Enabling pnpm via Corepack..." -ForegroundColor Yellow
    corepack enable
    corepack prepare pnpm@8.15.6 --activate
}

$apiEnv = Join-Path $Root "api\.env"
$apiEnvExample = Join-Path $Root "api\.env.example"
if (-not (Test-Path $apiEnv)) {
    Copy-Item $apiEnvExample $apiEnv
    Write-Host "Created api\.env" -ForegroundColor Green
} else {
    Write-Host "api\.env already exists" -ForegroundColor Green
}

$appEnv = Join-Path $Root "app\.env.local"
$appEnvExample = Join-Path $Root "app\.env.example"
if (-not (Test-Path $appEnv)) {
    Copy-Item $appEnvExample $appEnv
    Write-Host "Created app\.env.local" -ForegroundColor Green
}

New-Item -ItemType Directory -Force -Path (Join-Path $Root "uploads") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root "logs") | Out-Null

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Starting PostgreSQL (docker compose up -d db)..." -ForegroundColor Yellow
    Push-Location $Root
    docker compose up -d db
    if ($LASTEXITCODE -ne 0) {
        docker-compose up -d db
    }
    Pop-Location
    Start-Sleep -Seconds 10
} else {
    Write-Host "Docker not found. Start PostgreSQL manually before migrations." -ForegroundColor Yellow
}

Write-Host "Installing dependencies..." -ForegroundColor Yellow
Push-Location $Root
pnpm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Prisma generate, migrate, seed..." -ForegroundColor Yellow
Push-Location (Join-Path $Root "api")
pnpm prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm prisma db seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location
Pop-Location

Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Start dev servers: .\scripts\start-dev.ps1  or  pnpm dev"
Write-Host "Web: http://localhost:3000"
Write-Host "API: http://localhost:4000/v1/auth/health"
