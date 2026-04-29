param(
  [string]$Out = "",
  [string]$Tables = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if (-not (Test-Path "api/.env")) {
  throw "api/.env was not found. Run this script from the Legal repo or keep it in scripts/."
}

$envLines = Get-Content "api/.env"
$hasSupabaseUrl = $envLines | Where-Object { $_ -match '^SUPABASE_DATABASE_URL=' -and $_ -notmatch '^SUPABASE_DATABASE_URL=\s*$' }

if (-not $hasSupabaseUrl) {
  throw "SUPABASE_DATABASE_URL is missing in api/.env. Add the Supabase pooler URI first."
}

$argsForExporter = @("--source=supabase")

if ($Out.Trim()) {
  $outputPath = $Out
  if (-not [System.IO.Path]::IsPathRooted($outputPath)) {
    $outputPath = Join-Path $repoRoot $outputPath
  }
  $argsForExporter += "--out=$outputPath"
}

if ($Tables.Trim()) {
  $argsForExporter += "--tables=$Tables"
}

Write-Host "Exporting ML CSV data from Supabase..."
Write-Host "Raw CSVs may contain PII. Keep data/ml-exports local and do not commit it." -ForegroundColor Yellow

pnpm --filter caseiq-api data:export-ml-csv -- @argsForExporter
