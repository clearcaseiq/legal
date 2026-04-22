# Push Notifications Setup - Run all 3 steps
# Execute from repo root: .\apps\mobile\scripts\setup-push-notifications.ps1

$ErrorActionPreference = "Stop"
$mobileDir = Join-Path $PSScriptRoot ".."
Set-Location $mobileDir

$easCmd = Join-Path $mobileDir "node_modules\.bin\eas.CMD"
if (-not (Test-Path $easCmd)) {
    $easCmd = "npx"
    $easArgs = @("eas-cli")
} else {
    $easArgs = @()
}

function Run-Eas {
    param([string[]]$EasArgs, [switch]$CaptureOutput)
    if ($CaptureOutput) {
        $script:LastEasOutput = @()
        if ($easCmd -eq "npx") {
            $script:LastEasOutput = & npx eas-cli @EasArgs 2>&1
        } else {
            $script:LastEasOutput = & $easCmd @EasArgs 2>&1
        }
    } else {
        if ($easCmd -eq "npx") {
            & npx eas-cli @EasArgs
        } else {
            & $easCmd @EasArgs
        }
    }
}

Write-Host "`n=== Step 1: EAS Login & Init ===" -ForegroundColor Cyan
$whoami = Run-Eas whoami 2>&1
if ($LASTEXITCODE -ne 0 -or $whoami -match "Not logged in") {
    Write-Host "Opening EAS login in browser..." -ForegroundColor Yellow
    Start-Process "https://expo.dev/login"
    Write-Host "Please log in, then press Enter to continue..." -ForegroundColor Yellow
    Read-Host
}
Write-Host "Initializing EAS project..." -ForegroundColor Yellow
$maxRetries = 3
$initSuccess = $false
for ($i = 1; $i -le $maxRetries; $i++) {
    Run-Eas @("init", "--non-interactive") -CaptureOutput | Out-Null
    $initOutput = $script:LastEasOutput -join "`n"
    if ($LASTEXITCODE -eq 0) {
        $initSuccess = $true
        break
    }
    if ($initOutput -match "GraphQL request failed") {
        Write-Host "GraphQL error (attempt $i/$maxRetries). Possible causes:" -ForegroundColor Yellow
        Write-Host "  - Expo servers temporarily unavailable (try again in a few minutes)" -ForegroundColor Gray
        Write-Host "  - Network/firewall blocking expo.dev" -ForegroundColor Gray
        Write-Host "  - Try: eas logout, then eas login" -ForegroundColor Gray
        if ($i -lt $maxRetries) {
            Write-Host "Retrying in 10 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
        } else {
            Write-Host "`nManual fallback: Create project at https://expo.dev, copy projectId, add to .env:" -ForegroundColor Cyan
            Write-Host "  EXPO_PUBLIC_PROJECT_ID=your-project-uuid" -ForegroundColor White
            exit 1
        }
    } else {
        Write-Host "EAS init failed: $initOutput" -ForegroundColor Red
        exit 1
    }
}
if (-not $initSuccess) { exit 1 }
Write-Host "Step 1 complete.`n" -ForegroundColor Green

Write-Host "=== Step 2: Development Build ===" -ForegroundColor Cyan
Write-Host "Building Android APK (10-15 min). You can track at expo.dev..." -ForegroundColor Yellow
Run-Eas @("build", "--profile", "development", "--platform", "android", "--non-interactive")
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Check errors above." -ForegroundColor Red
    exit 1
}
Write-Host "Step 2 complete. Download APK from the link above.`n" -ForegroundColor Green

Write-Host "=== Step 3: Firebase & FCM ===" -ForegroundColor Cyan
Start-Process "https://console.firebase.google.com/"
Write-Host "Firebase Console opened. Do the following:" -ForegroundColor Yellow
Write-Host "1. Create project (or select existing)" -ForegroundColor White
Write-Host "2. Add Android app, package: com.caseiq.attorney" -ForegroundColor White
Write-Host "3. Download google-services.json" -ForegroundColor White
Write-Host "4. Save to: $mobileDir\google-services.json" -ForegroundColor White
Write-Host "5. Project Settings > Service accounts > Generate new private key" -ForegroundColor White
Write-Host "6. Run: cd apps\mobile && pnpm exec eas credentials" -ForegroundColor White
Write-Host "   Select: Android > production > Google Service Account > Upload JSON" -ForegroundColor White
Write-Host "`nAll steps complete!" -ForegroundColor Green
