# AWS Deployment Setup Script
# Run from repo root: .\deploy\aws\setup.ps1
# Prerequisites: AWS CLI installed and configured (aws configure)

param(
    [string]$Region = "us-east-1",
    [switch]$SkipEcr,
    [switch]$SkipS3,
    [switch]$SkipRds
)

$ErrorActionPreference = "Stop"

# Get AWS Account ID
$AccountId = aws sts get-caller-identity --query Account --output text
if (-not $AccountId) {
    Write-Error "AWS CLI not configured. Run: aws configure"
}

$EcrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com"
$Timestamp = Get-Date -Format "yyyyMMdd"

Write-Host "=== Legal AWS Deployment Setup ===" -ForegroundColor Cyan
Write-Host "Account: $AccountId | Region: $Region`n"

# 1. Create ECR repository for API
if (-not $SkipEcr) {
    Write-Host "Creating ECR repository..." -ForegroundColor Yellow
    aws ecr describe-repositories --repository-names legal-api --region $Region 2>$null
    if ($LASTEXITCODE -ne 0) {
        aws ecr create-repository --repository-name legal-api --region $Region
        Write-Host "  Created legal-api" -ForegroundColor Green
    } else {
        Write-Host "  legal-api already exists" -ForegroundColor Gray
    }
}

# 2. Create S3 buckets for web and uploads
if (-not $SkipS3) {
    Write-Host "`nCreating S3 buckets..." -ForegroundColor Yellow
    $WebBucket = "legal-web-$AccountId"
    $UploadsBucket = "legal-uploads-$AccountId"
    
    aws s3 mb "s3://$WebBucket" --region $Region 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Created $WebBucket" -ForegroundColor Green
    } else {
        Write-Host "  $WebBucket may already exist" -ForegroundColor Gray
    }
    
    aws s3 mb "s3://$UploadsBucket" --region $Region 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Created $UploadsBucket" -ForegroundColor Green
    } else {
        Write-Host "  $UploadsBucket may already exist" -ForegroundColor Gray
    }
    
    # Enable static website hosting for web bucket
    $WebsiteConfig = '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'
    aws s3 website "s3://$WebBucket" --index-document index.html --error-document index.html 2>$null
    
    Write-Host "`n  S3 Web bucket: $WebBucket" -ForegroundColor Cyan
    Write-Host "  S3 Uploads bucket: $UploadsBucket" -ForegroundColor Cyan
}

# 3. RDS - manual step
if (-not $SkipRds) {
    Write-Host "`n=== RDS MySQL (manual) ===" -ForegroundColor Yellow
    Write-Host "1. Go to AWS RDS Console -> Create database"
    Write-Host "2. Choose MySQL 8.0"
    Write-Host "3. Template: Dev/Test or Production"
    Write-Host "4. DB name: injury_intelligence"
    Write-Host "5. Note the endpoint and set DATABASE_URL in App Runner"
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Build and push API:  .\deploy\aws\build-and-push.ps1"
Write-Host "2. Create App Runner service (see docs/AWS_DEPLOYMENT.md)"
Write-Host "3. Deploy web:  .\deploy\aws\deploy-web.ps1 -ApiUrl https://your-app-runner-url"
Write-Host ""
