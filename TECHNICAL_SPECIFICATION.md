# ClearCaseIQ Technical Specification

## 1. Purpose

ClearCaseIQ is a personal-injury case intelligence and attorney-routing platform. It supports plaintiff intake, evidence processing, AI-assisted case analysis, attorney matching, attorney workflow management, admin operations, and an Expo mobile attorney app.

This specification defines the development and production architecture, runtime services, integrations, configuration, deployment process, and operational checks.

## 2. Repository Structure

```text
.
├── api/                     # Express API, Prisma, routing, evidence, AI, payments
├── app/                     # Next.js web app
├── apps/mobile/             # Expo React Native attorney mobile app
├── apps/ml-service/         # ML/vector support assets
├── deploy/                  # Nginx and deployment docs
├── docker-compose.prod.yml  # Production Docker Compose stack
├── pnpm-lock.yaml           # Workspace lockfile
└── package.json             # pnpm workspace root
```

Workspace packages:

- `caseiq-api`: backend API
- `caseiq-web`: web frontend
- `caseiq-mobile`: mobile app

## 3. Core Architecture

### 3.1 Web Frontend

- Package: `app`
- Framework: Next.js with React and TypeScript
- Runtime port:
  - Development: `3000`
  - Production container: `3000`
- API origin:
  - Development: from web env/runtime defaults
  - Production: `NEXT_PUBLIC_API_URL=https://api.clearcaseiq.com`

Primary responsibilities:

- Public marketing and SEO pages
- Plaintiff intake
- Plaintiff results/case intelligence
- Attorney registration/login
- Attorney dashboard
- Admin console
- Evidence upload UI
- Case workflow UI

### 3.2 API Backend

- Package: `api`
- Runtime: Node.js, Express, TypeScript
- ORM: Prisma
- Runtime port:
  - Development: `4000`
  - Production container: `4000`

Primary responsibilities:

- Authentication and authorization
- Plaintiff assessments and intake storage
- Prediction and case analysis
- Evidence upload and OCR orchestration
- Attorney dashboard APIs
- Routing and lifecycle engine
- Admin configuration
- Stripe/payment endpoints
- Calendar OAuth/sync
- Messaging
- Mobile API support

### 3.3 Database

- PostgreSQL
- Prisma ORM
- pgvector enabled in production Docker DB image
- Production options:
  - Docker Compose `db` service
  - Supabase/Postgres by overriding `DATABASE_URL`

Important models include:

- `User`
- `Assessment`
- `Prediction`
- `EvidenceFile`
- `ExtractedData`
- `Attorney`
- `AttorneyProfile`
- `LeadSubmission`
- `RoutingWave`
- `Appointment`
- `ChatRoom`
- `BillingInvoice`
- `PlatformPayment`
- `RoutingConfig`

### 3.4 Mobile App

- Package: `apps/mobile`
- Framework: Expo React Native with Expo Router
- App name: `ClearCaseIQ Attorney`
- Bundle identifier: `com.caseiq.attorney`
- Production API default: `https://api.clearcaseiq.com`

Mobile capabilities:

- Attorney login
- Biometric unlock
- Push notification setup
- Dashboard
- Case inbox
- Lead detail
- Accept/decline
- Messages
- Calendar
- Document requests
- Tasks
- Contacts
- Notes
- Files/evidence
- Billing
- Google/Microsoft calendar sync controls

## 4. Development Environment

### 4.1 Required Tools

- Node.js compatible with the workspace
- pnpm
- PostgreSQL or Supabase database
- AWS CLI if testing S3/Textract locally
- Expo/EAS CLI for mobile builds

### 4.2 Install Dependencies

```bash
pnpm install
```

### 4.3 API Development Environment

API env file:

```text
api/.env
```

Minimum local variables:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
SESSION_SECRET=...
API_URL=http://localhost:4000
WEB_URL=http://localhost:3000
```

Optional local variables:

```env
OPENAI_API_KEY=
OPENAI_ANALYSIS_MODEL=gpt-4o-mini
AWS_REGION=us-east-1
S3_BUCKET=
ENABLE_OCR=true
PDF_TEXTRACT_FALLBACK=true
STRIPE_SECRET_KEY=
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
MICROSOFT_CALENDAR_CLIENT_ID=
MICROSOFT_CALENDAR_CLIENT_SECRET=
```

Start API:

```bash
pnpm --filter caseiq-api dev
```

Health check:

```bash
curl http://localhost:4000/health
```

### 4.4 Web Development Environment

Start web:

```bash
pnpm --filter caseiq-web dev
```

Open:

```text
http://localhost:3000
```

### 4.5 Mobile Development Environment

Mobile env file:

```text
apps/mobile/.env
```

For simulator/local:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

For physical phone:

```env
EXPO_PUBLIC_API_URL=http://<LAN_IP>:4000
```

For production/TestFlight:

```env
EXPO_PUBLIC_API_URL=https://api.clearcaseiq.com
```

Start mobile:

```bash
pnpm --filter caseiq-mobile start
```

### 4.6 Development Verification

API build:

```bash
pnpm --filter caseiq-api build
```

Web lint:

```bash
pnpm --filter caseiq-web lint
```

Mobile tests:

```bash
pnpm --filter caseiq-mobile test
```

Mobile typecheck:

```bash
pnpm --filter caseiq-mobile exec tsc --noEmit
```

## 5. Production Architecture

Production is currently designed for a single EC2 host running Docker Compose.

Services:

- `web`: Next.js frontend
- `api`: Express API
- `db`: PostgreSQL with pgvector
- `nginx`: SSL reverse proxy

Public hosts:

- `https://www.clearcaseiq.com`
- `https://clearcaseiq.com`
- `https://api.clearcaseiq.com`

Traffic flow:

```text
Browser / Mobile App
  ├── https://www.clearcaseiq.com -> nginx -> web:3000
  └── https://api.clearcaseiq.com -> nginx -> api:4000 -> PostgreSQL / S3 / Textract / OpenAI / Stripe
```

## 6. Production Configuration

Production env file:

```text
.env.prod
```

Create from:

```bash
cp .env.prod.example .env.prod
```

Required production values:

```env
POSTGRES_PASSWORD=
DATABASE_URL=
JWT_SECRET=
SESSION_SECRET=
API_URL=https://api.clearcaseiq.com
WEB_URL=https://www.clearcaseiq.com
CORS_ORIGINS=https://www.clearcaseiq.com,https://clearcaseiq.com
TRUST_PROXY=1
```

AI:

```env
OPENAI_API_KEY=
OPENAI_ANALYSIS_MODEL=gpt-4o-mini
```

AWS evidence processing:

```env
FILE_BUCKET=s3
S3_BUCKET=
AWS_REGION=us-east-1
OCR_PROVIDER=aws_textract
ENABLE_OCR=true
PDF_TEXTRACT_FALLBACK=true
```

Calendar:

```env
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=https://api.clearcaseiq.com/v1/attorney-calendar/callback/google
MICROSOFT_CALENDAR_CLIENT_ID=
MICROSOFT_CALENDAR_CLIENT_SECRET=
MICROSOFT_CALENDAR_REDIRECT_URI=https://api.clearcaseiq.com/v1/attorney-calendar/callback/microsoft
```

Payments:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID=
STRIPE_LEAD_CREDIT_PRICE_ID=
```

Stripe routing-fee checkout is controlled in Admin:

```text
Admin -> Matching Rules -> Pricing -> Stripe payments on/off
```

The default config is off:

```text
routingFeePaymentsEnabled: false
```

## 7. Production Deployment

### 7.1 Build And Start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 7.2 Database Setup

For a fresh database:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api pnpm prisma:generate
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api node ../node_modules/prisma/build/index.js db push
```

If using Supabase, ensure `DATABASE_URL` points to Supabase and schema is synchronized before accepting production traffic.

### 7.3 Redeploy

```bash
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache web api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d web api nginx
```

Frontend changes require rebuilding `web` because Next.js bakes client code and `NEXT_PUBLIC_*` values into the build.

### 7.4 Verify Production

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
curl -I https://www.clearcaseiq.com
curl -I https://api.clearcaseiq.com
curl https://api.clearcaseiq.com/health
```

## 8. Security Requirements

### 8.1 Secrets

Never commit:

- `.env`
- `.env.prod`
- AWS keys
- OpenAI keys
- Stripe keys
- OAuth secrets
- Apple private keys

Use example files only for placeholders.

### 8.2 Authentication

- JWT-based auth for API access
- Session support for OAuth flows
- Role-aware UI behavior for plaintiff, attorney, and admin users
- Admin access gated by configured admin emails/role checks

### 8.3 CORS

Production CORS must only allow trusted origins:

```env
CORS_ORIGINS=https://www.clearcaseiq.com,https://clearcaseiq.com
```

### 8.4 Proxy Trust

Behind Nginx:

```env
TRUST_PROXY=1
```

### 8.5 Evidence/File Security

Evidence is sensitive. Production should use:

- Private S3 bucket
- Least-privilege IAM role
- Authenticated API file access
- No public bucket listing
- Short-lived signed URLs if direct S3 access is added later

## 9. External Integrations

### 9.1 OpenAI

Used for:

- Case analysis
- Evidence summarization
- Extraction assistance
- Narrative intelligence
- Attorney-facing insights

Configuration:

```env
OPENAI_API_KEY=
OPENAI_ANALYSIS_MODEL=gpt-4o-mini
```

### 9.2 AWS S3 And Textract

Used for:

- Evidence storage
- OCR and document text extraction
- PDF fallback extraction

Recommended production auth:

- IAM role attached to EC2
- Least privilege for target bucket and Textract APIs

### 9.3 Stripe

Used for:

- Routing fees
- Subscription checkout
- Lead credits
- Saved payment methods
- Stripe Connect

Routing fee checkout can be disabled in Admin without removing pricing tiers.

### 9.4 Google And Microsoft Calendar

Used for:

- Attorney calendar connection
- Busy block sync
- Consultation scheduling availability
- Optional webhook-based auto-sync

Redirect URLs:

```text
https://api.clearcaseiq.com/v1/attorney-calendar/callback/google
https://api.clearcaseiq.com/v1/attorney-calendar/callback/microsoft
```

### 9.5 Twilio And Resend

Used for communication workflows when configured:

- SMS
- Email
- Notifications
- Follow-ups

## 10. Key Functional Modules

### 10.1 Plaintiff Intake

Collects:

- Incident date
- Claim type
- Venue
- Narrative
- Treatment
- Insurance
- Medicare/Medicaid
- Evidence
- Consent

### 10.2 Case Intelligence

Produces:

- Case viability
- SOL status
- Evidence gaps
- Settlement drivers
- Treatment signals
- Attorney-readiness indicators

Valuation model:

- Shows two separate outputs: `Estimated Settlement Range` as the primary plaintiff-facing number, and `Potential Trial Value` as a separate litigation-exposure range.
- Uses a heuristic V1 model based on injury-supported anchors, treatment severity tiers, liability scoring, evidence scoring, settlement compression, venue signals, and policy-limit constraints.
- Expected settlement range is modeled as injury-supported value times settlement compression, liability risk, evidence confidence, and venue/insurance constraints.
- Potential trial value is modeled from economic damages, non-economic damages, and future damages, adjusted by liability, venue, jury risk, and evidence strength.
- Medical bills influence economic damages, injury severity, treatment credibility, pain and suffering, settlement floor, and trial exposure, but the model must not rely only on a medical-bills multiplier.
- Product language should say ClearCaseIQ estimates a likely settlement range and separate potential trial value; avoid presenting any case as worth one fixed dollar amount.

### 10.3 Evidence Processing

Supports:

- Upload
- OCR
- Textract fallback
- Extracted text
- Extracted data
- Processing status

### 10.4 Attorney Routing

Uses:

- Matching rules
- Attorney profile/preferences
- Jurisdiction
- Case type
- Capacity
- Ranking weights
- Routing waves

### 10.5 Attorney Dashboard

Includes:

- Leads
- Case details
- Messages
- Calendar
- Evidence
- Tasks
- Notes
- Contacts
- Billing
- Demand workflow
- Case health

### 10.6 Admin Console

Controls:

- Routing enabled/disabled
- Matching rules
- Pricing tiers
- Stripe payments toggle
- Attorneys
- Cases
- Evidence oversight
- Calendar health

### 10.7 Mobile App

Supports:

- Attorney login
- Biometric unlock
- Push notifications
- Lead review
- Accept/decline
- Calendar sync
- Messages
- Tasks
- Billing
- Document requests

## 11. App Store Deployment

Mobile production build:

```bash
cd apps/mobile
set EXPO_PUBLIC_API_URL=https://api.clearcaseiq.com
pnpm run build:production:ios
```

Submit:

```bash
pnpm run submit:production:ios
```

App Store Connect requirements:

- App record
- Bundle ID: `com.caseiq.attorney`
- Screenshots
- Description
- Privacy policy URL
- Support URL
- App privacy questionnaire
- Test attorney login
- TestFlight validation

## 12. Operational Runbooks

### 12.1 Check Local Servers

```bash
curl http://localhost:4000/health
curl -I http://localhost:3000
```

### 12.2 Check AWS CLI Session

```bash
aws sts get-caller-identity
```

If expired:

```bash
aws login
```

### 12.3 Check Production Logs

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f web
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f nginx
```

### 12.4 Verify Latest Code On AWS

```bash
git rev-parse --short HEAD
git log -1 --oneline
```

### 12.5 Pull Selected Files Only

```bash
git fetch origin main
git checkout origin/main -- path/to/file
```

Rebuild affected containers after pulling selected frontend/backend files.

## 13. Known Production Caveats

- California is currently the only automated State Bar lookup.
- Unsupported attorney bar states should use manual license upload.
- Stripe routing-fee payments are off by default in Admin.
- Frontend changes require rebuilding the web image.
- `NEXT_PUBLIC_API_URL` must be correct at web build time.
- Production DB schema must match Prisma schema.
- AWS CLI sessions may expire and require `aws login`.
- Mobile production builds must point to `https://api.clearcaseiq.com`.

## 14. Release Checklist

Before a production release:

- API builds successfully.
- Web lint passes.
- Mobile tests/typecheck pass if mobile code changed.
- `.env.prod` has required secrets.
- Database schema is current.
- `NEXT_PUBLIC_API_URL` is correct.
- Nginx config is valid.
- SSL certificate is valid.
- API health endpoint returns OK.
- Web homepage loads.
- Attorney dashboard loads.
- Admin matching rules load.
- Intake can create an assessment.
- Evidence upload works.
- Case acceptance works with current Stripe toggle state.
- Mobile app can authenticate against production API.

