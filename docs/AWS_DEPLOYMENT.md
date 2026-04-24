# AWS Deployment Guide

Deploy the Legal app to AWS using **S3 + CloudFront** (web), **App Runner** (API), and **RDS MySQL** (database).

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Users     │────▶│  CloudFront  │────▶│  S3 (Web)   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                      │
       │                      │ API calls
       │                      ▼
       │              ┌──────────────┐     ┌─────────────┐
       └─────────────▶│ App Runner   │────▶│ RDS MySQL   │
                      │ (API)        │     └─────────────┘
                      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ S3 (uploads) │
                      └──────────────┘
```

## Prerequisites

- **GitHub repo** with the code pushed
- **AWS account** – you'll configure access via GitHub Secrets (no local AWS CLI or Docker needed)

## Step 1: Initial AWS Setup

Create AWS resources once. Use [AWS Console](https://console.aws.amazon.com/) or run locally with AWS CLI:

```powershell
.\deploy\aws\setup.ps1
```

This creates:
- **ECR repository** `legal-api` for the API Docker image
- **S3 bucket** `legal-web-{account-id}` for the web app
- **S3 bucket** `legal-uploads-{account-id}` for file uploads

## Step 2: Create RDS MySQL Database

1. Go to [AWS RDS Console](https://console.aws.amazon.com/rds/) → **Create database**
2. Choose **MySQL 8.0**
3. Template: **Dev/Test** (or Production for prod)
4. Settings:
   - DB instance identifier: `legal-db`
   - Master username: `admin`
   - Master password: (save securely)
   - DB name: `injury_intelligence`
5. Instance: `db.t3.micro` (free tier) or larger
6. Storage: 20 GB
7. **Create database**
8. Wait for creation, then note the **Endpoint** (e.g. `legal-db.xxxxx.us-east-1.rds.amazonaws.com`)

**Connection string format:**
```
mysql://admin:YOUR_PASSWORD@endpoint:3306/injury_intelligence
```

## Step 3: Run Database Migrations

From your local machine (with DATABASE_URL pointing to RDS):

```powershell
cd apps\api
$env:DATABASE_URL = "mysql://admin:password@endpoint:3306/injury_intelligence"
pnpm prisma migrate deploy
```

## Step 4: Create App Runner Service

**First:** Run the deploy workflow once (Actions → Deploy to AWS → Run workflow) so the API image is pushed to ECR. Or run `.\deploy\aws\build-and-push.ps1` locally if you have Docker.

1. Go to [App Runner Console](https://console.aws.amazon.com/apprunner/) → **Create service**
2. **Source**: Container registry → Amazon ECR
3. **Image URI**: `{account-id}.dkr.ecr.us-east-1.amazonaws.com/legal-api:latest`
4. **Service name**: `legal-api`
5. **CPU**: 1 vCPU, **Memory**: 2 GB
6. **Environment variables** (add these):
   - `DATABASE_URL` – your RDS connection string
   - `JWT_SECRET` – generate: `openssl rand -base64 32`
   - `NODE_ENV` – `production`
   - `PORT` – `4000`
   - `FILE_BUCKET` – `s3` (or `local` for now; S3 uploads need code changes)
   - `OPENAI_API_KEY` – (if using AI features)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` – (if using Google OAuth)
   - `API_URL` – `https://your-app-runner-url` (set after creation)
   - `WEB_URL` – `https://your-web-url` (set after CloudFront/S3)
7. **Create service**
8. Copy the **Service URL** (e.g. `https://xxxxx.us-east-1.awsapprunner.com`)

## Step 5: Configure GitHub Actions

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `NEXT_PUBLIC_API_URL` | Your App Runner URL (e.g. `https://xxxxx.us-east-1.awsapprunner.com`) |
| `APP_RUNNER_SERVICE_ARN` | (Optional) App Runner service ARN – enables auto-deploy on push |

3. **Create an IAM user** for GitHub Actions (if needed):
   - IAM → Users → Create user → Attach policy: `AmazonEC2ContainerRegistryFullAccess`, `AmazonS3FullAccess`
   - For App Runner auto-deploy, also add: `AWSAppRunnerFullAccess`

## Step 6: Deploy via GitHub Actions

Push to `main` (or run the workflow manually: Actions → Deploy to AWS → Run workflow). GitHub Actions will:

1. Build the API Docker image
2. Push the image to ECR
3. Optionally trigger App Runner deployment (if `APP_RUNNER_SERVICE_ARN` is set)
4. Build the web app with `NEXT_PUBLIC_API_URL`
5. Deploy the web app to S3

**First deploy:** If App Runner was created before the image existed, go to App Runner → your service → **Deploy** and run a new deployment.

## Step 7: CloudFront (Optional, Recommended for Production)

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/) → **Create distribution**
2. **Origin**: S3 bucket `legal-web-{account-id}`
3. **Origin access**: Origin access control (recommended)
4. **Default root object**: `index.html`
5. **Error pages**: Add 403 and 404 → redirect to `/index.html` with 200 (for SPA routing)
6. **Create distribution**
7. Use the CloudFront URL (e.g. `https://d1234abcd.cloudfront.net`) as your web URL

## Step 8: Update CORS and URLs

In your API environment (App Runner):
- Set `WEB_URL` to your CloudFront or S3 website URL
- Ensure CORS in the API allows your web origin

---

### Manual deployment (optional)

If you prefer to deploy without GitHub Actions:

- **API:** `.\deploy\aws\build-and-push.ps1` (requires Docker Desktop and AWS CLI)
- **Web:** `.\deploy\aws\deploy-web.ps1 -ApiUrl "https://your-app-runner-url"`

## File Uploads (S3)

The API currently uses local disk for uploads. For production on App Runner (ephemeral storage), you should:

1. Add S3 upload logic using `@aws-sdk/client-s3`
2. Set `FILE_BUCKET=s3` and `AWS_S3_BUCKET=legal-uploads-{account-id}`
3. Configure IAM role for App Runner to access S3

## Troubleshooting

| Issue | Solution |
|-------|----------|
| ECR login fails | Run `aws configure` and verify credentials |
| Build fails | Ensure Docker is running; run from repo root |
| App Runner can't connect to RDS | Check security group: allow App Runner to access RDS on 3306 |
| Web shows blank page | Check browser console; verify `NEXT_PUBLIC_API_URL` matches API URL |
| CORS errors | Add your web origin to API CORS config |

## Cost Estimate (Monthly)

- **App Runner**: ~$25–50 (1 vCPU, 2 GB, low traffic)
- **RDS db.t3.micro**: ~$15 (free tier for 12 months)
- **S3**: ~$1–5 (depending on traffic)
- **CloudFront**: ~$1–10 (free tier: 1 TB transfer)
