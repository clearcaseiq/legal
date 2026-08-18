# Standing up the QA environment

One-time setup for `qa.clearcaseiq.com`. Day-to-day deploys, the compose file
and the image pipeline are in [`deploy/README.md`](../deploy/README.md); this
covers only the AWS resources and first launch.

QA runs the same stack as production from the same compose file, distinguished
entirely by `.env.qa`. It is not indexable, it sends no email or SMS, and it has
its own database.

Three steps are order-sensitive and marked below. Everything else can be done in
any order.

## 1. Database

A `db.t4g.micro` Postgres instance, single-AZ, in a security group that accepts
5432 **only** from the EC2 security group in step 3 — not from the internet.

No schema load is needed. The API entrypoint runs `prisma db push` on every boot
and creates the schema; an empty database and its credentials are enough.

It must be a different instance from production's. The same entrypoint that
builds the schema here would push QA's schema into production if it were handed
that connection string.

## 2. S3 bucket and instance role

Create the uploads bucket:

```bash
aws s3 mb s3://clearcaseiq-qa-uploads
```

Then an IAM role for the EC2 instance granting:

- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on **that bucket only**
- `textract:DetectDocumentText`

Deliberately **omit** `ses:SendEmail` and `sns:Publish`. `.env.qa.example`
already keeps outbound off by leaving the provider variables empty — with
`EMAIL_PROVIDER` blank and no `SES_FROM_EMAIL`, `resolveEmailProvider()` returns
`none` — but omitting the permissions means a later config mistake still cannot
reach a real claimant. The config is the intent; the role is the guarantee.

## 3. EC2 instance

A `t3.small` running Ubuntu, with the role from step 2 attached, in a security
group allowing:

- 80 and 443 from anywhere
- 22 from your address only

Install Docker with the commands in [`deploy/README.md`](../deploy/README.md).

QA can be stopped outside working hours; nothing in the stack keeps state on the
instance except the `api_uploads` volume.

## 4. DNS — before certificates

Allocate an Elastic IP, associate it with the instance, and create two Route 53
A records pointing at it:

- `qa.clearcaseiq.com`
- `api-qa.clearcaseiq.com`

Both are required. The browser reaches the API same-origin under `/v1`, so the
`api-qa` host is not needed for normal traffic — but Apple and Zoom will not
accept OAuth callbacks that differ from production's only by path, so `qa.conf`
serves a dedicated block for it.

## 5. Certificates — before the first `up`

Wait until both names resolve, then run certbot while 80 and 443 are still free.
nginx will claim them as soon as the stack starts.

```bash
sudo certbot certonly --standalone \
  -d qa.clearcaseiq.com \
  -d api-qa.clearcaseiq.com
```

The **first** `-d` determines the directory name, and `deploy/nginx/qa.conf`
expects `/etc/letsencrypt/live/qa.clearcaseiq.com/`. Reversing the two names
produces a valid certificate in a path nginx will not find, and the container
fails to start.

## 6. Configure

```bash
cp .env.qa.example .env.qa
nano .env.qa
```

Fill in the RDS connection string, the bucket name, and freshly generated
secrets:

```bash
openssl rand -base64 48   # once for JWT_SECRET, again for SESSION_SECRET
```

Generate them rather than copying production's. Reusing `JWT_SECRET` would make
a token minted in QA valid in production.

Do not build this file by copying `.env.prod`. `DATABASE_URL` and
`EMAIL_PROVIDER` are both actively dangerous carried over, for the reasons in
steps 1 and 2.

## 7. Launch

```bash
export GIT_COMMIT=$(git rev-parse --short HEAD)
export BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose -f docker-compose.deploy.yml --env-file .env.qa build
docker compose -f docker-compose.deploy.yml --env-file .env.qa up -d
```

Once the ECR pipeline is in use this becomes `pull` instead of `build` — see
[`deploy/README.md`](../deploy/README.md). Building on the box works today and
is not a prerequisite.

If the API container exits immediately, read the entrypoint output. A failed
`prisma db push` is the most likely first failure and is usually the RDS
security group rather than the schema:

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.qa logs api
```

## 8. Seed

QA holds synthetic data only, so populate it rather than restoring a snapshot:

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.qa exec api \
  node ../node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

That is the same invocation the operational scripts in `api/scripts/` document.
The runtime image never invokes pnpm, so the `seed:*` entries in
`api/package.json` are run by path rather than by script name:

```bash
# Attorneys to route cases to
docker compose -f docker-compose.deploy.yml --env-file .env.qa exec api \
  node ../node_modules/tsx/dist/cli.mjs scripts/seed-california-attorneys.ts

# A signed-in attorney account to test the dashboard with
docker compose -f docker-compose.deploy.yml --env-file .env.qa exec api \
  node ../node_modules/tsx/dist/cli.mjs scripts/ensure-seed-attorney-login.ts
```

Admin access does not need seeding: `ADMIN_EMAILS` in `.env.qa` is a bootstrap
allowlist, so signing in with an address on that list grants admin.

## 9. Verify

```bash
curl -s https://api-qa.clearcaseiq.com/health/ready
curl -s https://qa.clearcaseiq.com/robots.txt
curl -s https://qa.clearcaseiq.com/how-it-works | grep -o 'name="robots"[^>]*'
```

Expected: `/health/ready` returns 200 having run real queries, `robots.txt` is
the four-line blanket disallow, and the page carries `noindex`.

**If `robots.txt` comes back as the full 42-line production file**, then
`SEARCH_ENGINE_INDEXING=disabled` did not reach the container and QA is
indexable. Fix that before anything crawls it — QA serves the same 176 pages as
production and will compete with the live site for its own queries.

The same flag also clears `publicPage`, which gates `SiteAnalytics`. That is
what keeps QA traffic out of the production GA property, since the measurement
id is inlined into the image at build time and one promotable image carries it
everywhere.

## 10. OAuth, if you need social login

Add these to the **existing** app registrations as additional redirect URIs. Do
not edit the production entries.

| Provider | Redirect URI |
| --- | --- |
| Google | `https://api-qa.clearcaseiq.com/v1/auth/google/callback` |
| Microsoft | `https://api-qa.clearcaseiq.com/v1/auth/microsoft/callback` |
| Apple | `https://api-qa.clearcaseiq.com/v1/auth/apple/callback` |
| Zoom | `https://api-qa.clearcaseiq.com/v1/attorney-zoom/callback` |
| Google Calendar | `https://api-qa.clearcaseiq.com/v1/attorney-calendar/callback/google` |
| Microsoft Calendar | `https://api-qa.clearcaseiq.com/v1/attorney-calendar/callback/microsoft` |

Email-and-password login works without any of these, so this step can be
deferred until you actually need to exercise a provider. A missing registration
is the usual cause of "QA login is broken".
