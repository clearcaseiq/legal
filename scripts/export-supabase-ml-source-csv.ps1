param(
  [string]$Out = "",
  [int]$Limit = 0,
  [switch]$IncludeCasesRaw,
  [string]$PrefilterLabel = "",
  [int]$RowsPerFile = 0
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

$tables = @("case_runs", "case_extractions", "case_embeddings")
if ($IncludeCasesRaw) {
  $tables += "cases_raw"
}

$argsForExporter = @(
  "--source=supabase",
  "--schema=public",
  "--tables=$($tables -join ',')"
)

if ($Out.Trim()) {
  $outputPath = $Out
  if (-not [System.IO.Path]::IsPathRooted($outputPath)) {
    $outputPath = Join-Path $repoRoot $outputPath
  }
  $argsForExporter += "--out=$outputPath"
}

if ($Limit -gt 0) {
  $argsForExporter += "--limit=$Limit"
}

if ($PrefilterLabel.Trim()) {
  $argsForExporter += "--prefilter-label=$PrefilterLabel"
}

if ($RowsPerFile -gt 0) {
  $argsForExporter += "--rows-per-file=$RowsPerFile"
}

Write-Host "Exporting ML source CSV data from Supabase public schema..."
Write-Host "Raw CSVs may contain PII. Keep data/ml-exports local and do not commit it." -ForegroundColor Yellow

if (-not $IncludeCasesRaw) {
  Write-Host "Skipping cases_raw by default because it is very large. Add -IncludeCasesRaw when you need it." -ForegroundColor Yellow
} elseif ($PrefilterLabel.Trim()) {
  Write-Host "Filtering cases_raw to prefilter_label='$PrefilterLabel'." -ForegroundColor Yellow
}

pnpm --filter caseiq-api data:export-ml-csv -- @argsForExporter
