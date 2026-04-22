e should already be in a GitHub repo (e.g. `clearcaseiq/legal`)

### 1.2 AWS Account
- Go to [aws.amazon.com](https://aws.amazon.com) and create an account if needed
- You'll need a credit card (AWS has a free tier for 12 months)

### 1.3 Local Tools (for one-time setup)
- **Node.js** – [nodejs.org](https://nodejs.org) (v20 or later)
- **pnpm** – Run `npm install -g pnpm` after Node is installed
- **AWS CLI** (optional) – [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) – only needed for the setup script

---

## Part 2: Create AWS Resources

### 2.1 Log into AWS Console
1. Go to [console.aws.amazon.com](https://console.aws.amazon.com)
2. Sign in with your AWS account
3. Set the region to **US East (N. Virginia)** – top-right dropdown

### 2.2 Create ECR Repository (for API Docker image)
1. Search for **ECR** in the AWS search bar
2. Click **Repositories** in the left sidebar
3. Click **Create repository**
4. Repository name: `legal-api`
5. Click **Create repository**
6. Note the **URI** (e.g. `123456789.dkr.ecr.us-east-1.amazonaws.com/legal-api`)

### 2.3 Create S3 Buckets
1. Search for **S3** in the AWS search bar
2. Click **Create bucket**
3. **Bucket name**: `legal-web-YOUR_ACCOUNT_ID` (replace with your 12-digit AWS account ID – find it in the top-right menu)
4. Region: US East (N. Virginia)
5. Leave other settings default
6. Click **Create bucket**

7. Create a second bucket: `legal-uploads-YOUR_ACCOUNT_ID` (same steps)

8. **Enable static website hosting** for the web bucket:
   - Click the `legal-web-...` bucket
   - Go to **Properties** tab
   - Scroll to **Static website hosting** → **Edit**
   - Select **Enable**
   - Index document: `index.html`
   - Error document: `index.html` (for React routing)
   - Save

### 2.4 Create RDS MySQL Database
1. Search for **RDS** in the AWS search bar
2. Click **Create database**
3. **Engine**: MySQL 8.0
4. **Template**: Free tier (or Dev/Test)
5. **Settings**:
   - DB instance identifier: `legal-db`
   - Master username: `admin`
   - Master password: Choose a strong password and **save it somewhere safe**
   - DB name: `injury_intelligence`
6. **Instance configuration**: Burstable classes → `db.t3.micro` (free tier)
7. **Storage**: 20 GB
8. Click **Create database**
9. Wait 5–10 minutes for creation
10. When status is **Available**, click the database name
11. Copy the **Endpoint** (e.g. `legal-db.xxxxx.us-east-1.rds.amazonaws.com`)

**Your connection string will be:**
```
mysql://admin:YOUR_PASSWORD@legal-db.xxxxx.us-east-1.rds.amazonaws.com:3306/injury_intelligence
```

### 2.5 Run Database Migrations (from your computer)
1. Open PowerShell or Terminal
2. Go to your project:
   ```powershell
   cd c:\Business\Legal\apps\api
   ```
3. Set the database URL (replace with your actual password and endpoint):
   ```powershell
   $env:DATABASE_URL = "mysql://admin:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:3306/injury_intelligence"
   ```
4. Run migrations:
   ```powershell
   pnpm prisma migrate deploy
   ```
5. If you see "No pending migrations" or similar, you're good.

---

## Part 3: Create IAM User for GitHub Actions

GitHub needs AWS credentials to deploy. Create a dedicated user:

1. Search for **IAM** in the AWS search bar
2. Click **Users** in the left sidebar → **Create user**
3. User name: `github-actions-legal`
4. Click **Next**
5. **Attach policies directly** – add these:
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonS3FullAccess`
   - `AWSAppRunnerFullAccess`
6. Click **Next** → **Create user**
7. Click the user name → **Security credentials** tab
8. **Access keys** → **Create access key**
9. Choose **Application running outside AWS** → Next → Create
10. **Copy both** the Access key ID and Secret access key – you'll add them to GitHub. You won't see the secret again.

---

## Part 4: Create App Runner Service

App Runner will run your API. You need to push an image first, so we'll do this in two passes.

### 4.1 First: Push the API Image (via GitHub Actions)

We'll trigger a deploy to create the image, then create App Runner.

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets (you'll add more later):

| Name | Value |
|------|-------|
| `AWS_ACCESS_KEY_ID` | The access key from Part 3 |
| `AWS_SECRET_ACCESS_KEY` | The secret key from Part 3 |

4. Go to **Actions** tab → **Deploy to AWS** workflow
5. Click **Run workflow** → **Run workflow**
6. Wait for it to complete (2–5 minutes). The **deploy-api** job should succeed. The **deploy-web** job may fail if `VITE_API_URL` isn't set yet – that's OK for now.

### 4.2 Create App Runner Service
1. Search for **App Runner** in the AWS search bar
2. Click **Create service**
3. **Source**: Container registry
4. **Container image URI**: Click **Browse** and select `legal-api` → `latest`
5. **Service name**: `legal-api`
6. **CPU**: 1 vCPU
7. **Memory**: 2 GB
8. Click **Next**
9. **Environment variables** – add these (click Add for each):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `mysql://admin:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:3306/injury_intelligence` |
| `JWT_SECRET` | Generate one: run `openssl rand -base64 32` in terminal, or use a long random string |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `FILE_BUCKET` | `local` |

Add any others you need: `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.

10. Click **Next** → **Next** → **Create & deploy**
11. Wait for the service to deploy (3–5 minutes)
12. When status is **Running**, copy the **Default domain** (e.g. `xxxxx.us-east-1.awsapprunner.com`)
13. Your API URL is: `https://xxxxx.us-east-1.awsapprunner.com`

---

## Part 5: Add Remaining GitHub Secrets

1. Go to GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://YOUR_APP_RUNNER_DOMAIN` (no trailing slash) |
| `APP_RUNNER_SERVICE_ARN` | From App Runner console: your service → copy the ARN |

---

## Part 6: Deploy the Web App

1. Go to GitHub → **Actions** → **Deploy to AWS**
2. Click **Run workflow** → **Run workflow**
3. Wait for both jobs to complete (deploy-api and deploy-web)

---

## Part 7: Access Your App

### Web app
- **S3 URL**: `http://legal-web-YOUR_ACCOUNT_ID.s3-website-us-east-1.amazonaws.com`
- Or create a CloudFront distribution for HTTPS (see docs/AWS_DEPLOYMENT.md)

### API
- **API URL**: `https://YOUR_APP_RUNNER_DOMAIN`

---

## Part 8: Future Deploys

Whenever you push code to the `main` branch:

```powershell
cd c:\Business\Legal
git add .
git commit -m "Your change description"
git push origin main
```

GitHub Actions will automatically build and deploy. Check the **Actions** tab to see the progress.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ECR login failed | Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct |
| deploy-web fails: "VITE_API_URL" | Add VITE_API_URL secret with your App Runner URL |
| App Runner can't connect to database | Check RDS security group allows inbound on port 3306 from App Runner |
| Web shows blank page | Open browser console; verify VITE_API_URL matches your API URL |
| "No such image" when creating App Runner | Run the deploy workflow first to push the image to ECR |

---

## Summary Checklist

- [ ] AWS account created
- [ ] ECR repository `legal-api` created
- [ ] S3 buckets created (web + uploads)
- [ ] RDS MySQL created and migrations run
- [ ] IAM user created with access keys
- [ ] GitHub secrets added (AWS keys, VITE_API_URL, APP_RUNNER_SERVICE_ARN)
- [ ] First deploy workflow run (pushes image)
- [ ] App Runner service created with env vars
- [ ] Second deploy workflow run (deploys web)
- [ ] Web and API URLs verified
# Complete Deployment Walkthrough (Beginner Guide)

This guide walks you through deploying the Legal app to AWS from scratch. Follow the steps in order.

---

## What You'll End Up With

- **Web app** – Your React frontend, hosted on AWS S3
- **API** – Your Node.js backend, running on AWS App Runner
- **Database** – MySQL database on AWS RDS

---

## Part 1: Prerequisites

### 1.1 GitHub Account
- Go to [github.com](https://github.com) and sign in (or create an account)
- Your cod