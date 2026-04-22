# Start development servers - frees port 4000 if needed
Write-Host "Starting Injury Intelligence dev servers..." -ForegroundColor Cyan

# Kill any process on port 4000
$conn = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $pid = $conn.OwningProcess | Select-Object -First 1
    Write-Host "Stopping process $pid on port 4000..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Start database if Docker is available
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $db = docker ps --filter "name=injury-intelligence-db" --format "{{.Names}}" 2>$null
    if (-not $db) {
        Write-Host "Starting database (docker-compose up -d db)..." -ForegroundColor Yellow
        docker-compose up -d db 2>$null
        Start-Sleep -Seconds 5
    }
} else {
    Write-Host "Docker not found. Ensure MySQL is running on localhost:3306 for full API support." -ForegroundColor Yellow
}

Write-Host "Starting API and Web (pnpm dev)..." -ForegroundColor Green
Set-Location (Join-Path $PSScriptRoot "..")

# Run from repo root - turbo starts both API and web
pnpm dev
