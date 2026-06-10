# Windows Development Setup

This guide walks through setting up the ClearCaseIQ (`clearcaseiq/legal`) monorepo on a fresh Windows machine.

## Prerequisites

Install the following before cloning the repo:

| Tool | Purpose |
|------|---------|
| **Git** | Clone and pull the repository |
| **Node.js 18+** (LTS 20 or 22 recommended) | API and web runtimes |
| **pnpm 8.15.6** | Monorepo package manager (pinned in root `package.json`) |
| **Docker Desktop** | Local PostgreSQL database (recommended) |
| **AWS CLI v2** (optional) | Textract OCR for scanned PDFs and images |

Enable pnpm with Corepack after Node is installed:

```powershell
corepack enable
corepack prepare pnpm@8.15.6 --activate
```

Verify installations:

```powershell
node -v
pnpm -v
git --version
docker --version
```

## 1. Clone the repository

```powershell
git clone https://github.com/clearcaseiq/legal.git
cd legal
```

Check out the branch you need. For the latest settlement work:

```powershell
git fetch origin
git checkout latest_6-3_Settlement
```

For the default integration branch:

```powershell
git checkout main
```

Install dependencies from the **repository root**:

```powershell
pnpm install
```

## 2. GitHub access

Collaborators must accept the repository invitation before `git clone` / `git pull` over HTTPS will work for private access:

https://github.com/clearcaseiq/legal/invitations

For HTTPS pushes, use a **GitHub Personal Access Token** instead of an account password.

## 3. Environment files

Copy the example environment files:

```powershell
Copy-Item api\.env.example api\.env
Copy-Item app\.env.example app\.env.local
```

### API (`api\.env`)

Minimum local settings:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/injury_intelligence?schema=public"
JWT_SECRET="your-local-dev-secret"
PORT=4000
NODE_ENV=development
API_URL=http://localhost:4000
WEB_URL=http://localhost:3000
```

Optional but commonly used:

```env
OPENAI_API_KEY=
OCR_PROVIDER=aws_textract
ENABLE_OCR=true
AWS_REGION=us-east-1
PDF_TEXTRACT_FALLBACK=true
ML_SERVICE_URL=http://localhost:8000
ML_PREDICTION_MODE=shadow
```

For OCR without AWS, install [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki) and set:

```env
OCR_PROVIDER=tesseract
```

### Web (`app\.env.local`)

Local development can leave this mostly empty. The app defaults to `http://127.0.0.1:4000` when running on `localhost`.

To set it explicitly:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

> **Note:** The database is **PostgreSQL**, not MySQL. Use `postgresql://` in `DATABASE_URL`. Some older helper scripts still reference MySQL; prefer the steps in this document.

## 4. Start the database

From the repo root:

```powershell
docker compose up -d db
```

Confirm the container is running:

```powershell
docker ps
```

The database listens on **localhost:5432**.

## 5. Initialize the database

```powershell
cd api
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed
cd ..
```

## 6. Start development servers

### Option A — Windows setup script (first-time install)

From the repo root:

```powershell
.\scripts\setup.ps1
```

Then start dev servers:

```powershell
.\scripts\start-dev.ps1
```

> Do **not** use `scripts/setup.sh` on Windows unless you are in Git Bash/WSL. Use `setup.ps1` instead.

### Option B — start only (after setup)

From the repo root:

```powershell
.\scripts\start-dev.ps1
```

This script frees port 4000 if needed, starts the database container when Docker is available, then runs `pnpm dev` for the API and web app.

### Option C — separate terminals

```powershell
# Terminal 1 — API
cd api
pnpm dev

# Terminal 2 — Web
cd app
pnpm dev
```

### Option D — Turbo from root

```powershell
pnpm dev
```

## 7. Access the application

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API health | http://localhost:4000/v1/auth/health |

If port 3000 is already in use, Next.js may start on **http://localhost:3001** instead.

## 8. AWS CLI (Textract OCR)

For evidence OCR with AWS Textract:

```powershell
aws --version
aws login
aws sts get-caller-identity
```

Ensure `api\.env` includes:

```env
ENABLE_OCR=true
OCR_PROVIDER=aws_textract
AWS_REGION=us-east-1
PDF_TEXTRACT_FALLBACK=true
```

Complete sign-in in the browser when `aws login` opens the authorization page.

## 9. Verify the setup

```powershell
# API health
Invoke-WebRequest http://localhost:4000/v1/auth/health

# Web
Invoke-WebRequest http://localhost:3000
```

Optional test runs:

```powershell
cd api
pnpm test -- --run src/lib/underwriting-engine.test.ts

cd ..\app
pnpm test -- --run
```

## 10. Full Docker stack (optional)

To run database, API, web, and ML service together:

```powershell
docker compose up
```

For day-to-day development, most developers run **only the database in Docker** and start API + web with `pnpm dev`.

## Troubleshooting

### `setup.sh` fails with error 1012 / P1012

If your friend ran `scripts/setup.sh` and saw **1012** or **P1012**, that is almost always a **Prisma** error during database setup—not a generic shell failure.

Common causes:

1. **Wrong env file** — Older `setup.sh` copied root `.env` instead of `api/.env`. Prisma needs `api/.env` with a PostgreSQL `DATABASE_URL`.
2. **`docker-compose` not found** — Use Docker Desktop and `docker compose` (space), not only the legacy `docker-compose` binary.
3. **Database not running** — Start Postgres before migrations: `docker compose up -d db`.
4. **`migrate dev --name init` on an existing repo** — Use `migrate deploy`, not a new init migration.

**Fix on Windows (recommended):**

```powershell
# From repo root — do NOT use setup.sh on Windows
.\scripts\setup.ps1
```

**Manual fix if Prisma already failed:**

```powershell
Copy-Item api\.env.example api\.env -ErrorAction SilentlyContinue
docker compose up -d db
pnpm install
cd api
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed
cd ..
```

Confirm `api\.env` contains:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/injury_intelligence?schema=public"
JWT_SECRET="your-local-dev-secret"
```

If P1012 mentions an invalid schema, paste the full Prisma error text—usually a missing env var or DB connection issue.

### Port already in use

```powershell
netstat -ano | findstr :4000
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

Or use `.\scripts\start-dev.ps1`, which attempts to stop the process on port 4000.

### Database connection failed

- Confirm Docker Desktop is running.
- Run `docker compose up -d db` from the repo root.
- Confirm `DATABASE_URL` in `api\.env` uses `postgresql://`, not `mysql://`.

### Prisma migration errors

```powershell
cd api
pnpm prisma migrate deploy
pnpm prisma db seed
```

### Web cannot reach the API

- API should be listening on `http://127.0.0.1:4000`.
- Leave `NEXT_PUBLIC_API_URL` unset for local dev, or set `NEXT_PUBLIC_API_URL=http://localhost:4000` in `app\.env.local`.

### AWS session expired

```powershell
aws login
aws sts get-caller-identity
```

## Quick checklist

1. Install Node, pnpm, Git, Docker Desktop.
2. `git clone` → checkout branch → `pnpm install`.
3. Copy `api\.env.example` → `api\.env` and `app\.env.example` → `app\.env.local`.
4. `docker compose up -d db`
5. `cd api` → `pnpm prisma generate` → `pnpm prisma migrate deploy` → `pnpm prisma db seed`
6. `pnpm dev` (or `.\scripts\start-dev.ps1`)
7. Open http://localhost:3000

## Project layout

```
legal/
├── api/          # Express API (port 4000)
├── app/          # Next.js web app (port 3000)
├── apps/         # mobile, ml-service, directory-pipeline
├── docs/         # documentation (this file)
└── scripts/      # dev helpers (start-dev.ps1, setup-db.ps1)
```

## Related docs

- Root overview: [README.md](../README.md)
- Web runtime notes: [app/README.md](../app/README.md)
- API environment reference: [api/.env.example](../api/.env.example)
