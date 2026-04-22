# Build API Docker image and push to ECR
# Run from repo root: .\deploy\aws\build-and-push.ps1
# Prerequisites: Docker Desktop running, AWS CLI configured

param(
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

$AccountId = aws sts get-caller-identity --query Account --output text
$EcrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$ImageTag = "latest"

Write-Host "=== Build and Push API to ECR ===" -ForegroundColor Cyan
Write-Host "Repository: $EcrUri/legal-api`n"

# Login to ECR
Write-Host "Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrUri

# Build from repo root using monorepo Dockerfile
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $RepoRoot

Write-Host "`nBuilding API image..." -ForegroundColor Yellow
docker build -f docker/Dockerfile.api -t legal-api:$ImageTag .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed"
}

# Tag and push
Write-Host "`nPushing to ECR..." -ForegroundColor Yellow
docker tag legal-api:$ImageTag "$EcrUri/legal-api:$ImageTag"
docker push "$EcrUri/legal-api:$ImageTag"

Write-Host "`nDone! Image: $EcrUri/legal-api:$ImageTag" -ForegroundColor Green
Write-Host "Use this image URI when creating your App Runner service."
