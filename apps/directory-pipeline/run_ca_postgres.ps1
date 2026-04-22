# Run California directory pipeline against PostgreSQL only (no SQLite).
# Usage:
#   .\run_ca_postgres.ps1
#   .\run_ca_postgres.ps1 -DatabaseUrl "postgresql://user:pass@localhost:5432/directory_pipeline"
#
# Requires: psql on PATH (or PSQL_EXE), Python with psycopg2, network access to CA Bar.

param(
    [string]$DatabaseUrl = $env:DIRECTORY_PIPELINE_DATABASE_URL,
    [int]$FetchBatch = 25,
    [int]$ParseBatch = 50
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $DatabaseUrl -or -not $DatabaseUrl.ToLower().StartsWith("postgresql")) {
    Write-Error "Set DIRECTORY_PIPELINE_DATABASE_URL to a postgresql:// URL, or pass -DatabaseUrl."
}

$env:DIRECTORY_PIPELINE_DATABASE_URL = $DatabaseUrl
$env:DIRECTORY_PIPELINE_REQUIRE_POSTGRES = "1"

python scripts/init_postgres_schema.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python scripts/run_ca_to_completion.py --seed --postgres-only --fetch-batch $FetchBatch --parse-batch $ParseBatch
exit $LASTEXITCODE
