# Updates DATABASE_URL and runs Prisma migrate
# Usage: .\scripts\setup-db.ps1 -Password "your_mysql_password"
#        .\scripts\setup-db.ps1 -Password ""   (for no password)
param([string]$Password = "password")

if ($Password -eq "") {
    $url = "mysql://root:@localhost:3306/injury_intelligence"
} else {
    $url = "mysql://root:$Password@localhost:3306/injury_intelligence"
}

$envPath = Join-Path $PSScriptRoot "..\api\.env"
$content = Get-Content $envPath -Raw
$content = $content -replace 'DATABASE_URL=.*', "DATABASE_URL=`"$url`""
$content = $content.TrimEnd()
Set-Content $envPath $content
Write-Host "Updated DATABASE_URL in api/.env" -ForegroundColor Green

Set-Location (Join-Path $PSScriptRoot "..\api")
pnpm prisma migrate deploy
