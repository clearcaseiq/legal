# Step 1: production iOS build. Step 2: submit latest build to App Store Connect.
# Run from an interactive terminal (Cursor Terminal or PowerShell) — Apple login prompts required on first run.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Eas = "node"
$EasArgs = @("../../node_modules/eas-cli/bin/run")

Write-Host "`n=== Step 1: Production iOS build ===" -ForegroundColor Cyan
& $Eas @EasArgs build --profile production --platform ios
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== Step 2: Submit to App Store Connect (TestFlight) ===" -ForegroundColor Cyan
& $Eas @EasArgs submit --profile production --platform ios --latest
exit $LASTEXITCODE
