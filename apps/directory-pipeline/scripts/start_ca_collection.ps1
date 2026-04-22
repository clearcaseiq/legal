# California Attorney Directory Collection
# Prerequisites: PostgreSQL with directory_pipeline database, schema applied
# 1. createdb directory_pipeline
# 2. psql -d directory_pipeline -f schema.sql

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Set-Location $rootDir

Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
pip install -q -r requirements.txt

Write-Host "`nSeeding California fetch jobs..." -ForegroundColor Cyan
python -m scripts.seed_ca_jobs

Write-Host "`nStarting pipeline (fetch + parse). Run multiple times to process more." -ForegroundColor Cyan
python -m scripts.run_pipeline 5 20

Write-Host "`nDone. Run 'python -m scripts.run_pipeline 5 20' again to continue." -ForegroundColor Green
