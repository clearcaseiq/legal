# Setup directory_pipeline database
# Requires: PostgreSQL client (psql) in PATH

$schemaPath = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "schema.sql"
$dbUrl = $env:DIRECTORY_PIPELINE_DATABASE_URL -or $env:DATABASE_URL -or "postgresql://localhost:5432/directory_pipeline"

# Parse connection string for createdb
if ($dbUrl -match "postgresql://[^:]+:[^@]+@([^:]+):(\d+)/(.+)") {
    $host = $Matches[1]
    $port = $Matches[2]
    $db = $Matches[3]
    Write-Host "Creating database: $db" -ForegroundColor Cyan
    & createdb -h $host -p $port $db 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Database may already exist. Continuing..." -ForegroundColor Yellow
    }
    Write-Host "Applying schema..." -ForegroundColor Cyan
    & psql $dbUrl -f $schemaPath
} else {
    Write-Host "Could not parse DATABASE_URL. Run manually:" -ForegroundColor Yellow
    Write-Host "  createdb directory_pipeline"
    Write-Host "  psql -d directory_pipeline -f schema.sql"
}
