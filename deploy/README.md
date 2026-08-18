# ClearCaseIQ Deployment

Each environment runs on one EC2 host with Docker Compose:

- `web`: Next.js frontend on internal port `3000`
- `api`: Express API on internal port `4000`
- `nginx`: public reverse proxy for SSL and routing

Postgres is managed (RDS), not a container. See [Database](#database).

## Environments

One compose file serves both. Which environment you get comes entirely from the
env file you pass:

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.prod up -d   # production
docker compose -f docker-compose.deploy.yml --env-file .env.qa   up -d   # QA
```

| | Production | QA |
| --- | --- | --- |
| Web | `https://www.clearcaseiq.com` (apex redirects to `www`) | `https://qa.clearcaseiq.com` |
| API | `https://api.clearcaseiq.com` | `https://api-qa.clearcaseiq.com` |
| nginx config | `deploy/nginx/prod.conf` | `deploy/nginx/qa.conf` |
| Env file | `.env.prod` | `.env.qa` |
| Database | its own RDS instance | its own RDS instance |
| Indexable | yes | no — `SEARCH_ENGINE_INDEXING=disabled` |
| Outbound email/SMS | live | off by omission |

This replaced `docker-compose.prod.yml`, which hardcoded the production
hostnames in its `environment:` and `args:` blocks. Compose gives those
precedence over `env_file:`, so a QA host reading `.env.qa` would still have
come up talking to production — and because the API entrypoint runs
`prisma db push` on boot, the first thing it would have done is push QA's schema
into the production database.

Nothing in the compose file names an environment now. The values that would be
dangerous to guess are declared `:?`, so a missing one stops the stack with the
variable's name instead of falling back.

**Upgrading an existing host:** `.env.prod` predates this split and will be
missing `DEPLOY_ENV`, `SITE_URL` and possibly `DATABASE_URL`. Add them from
`.env.prod.example` before the first `up`, or the stack refuses to start.

**Standing QA up for the first time:** see
[`docs/QA_ENVIRONMENT.md`](../docs/QA_ENVIRONMENT.md) for the AWS resources, DNS
and certificate steps, three of which are order-sensitive.

### Why the browser no longer calls the API cross-origin

The web image used to take `NEXT_PUBLIC_API_URL` as a build arg. Next inlines
`NEXT_PUBLIC_*` at build time, so that compiled one environment's API hostname
into the bundle and made the image unpromotable — QA and production could not
run the same artifact, which is most of the reason to have a QA tier.

The build arg is gone. `getApiOrigin()` in `app/src/lib/runtimeEnv.ts` falls back
to same-origin when it is unset, and nginx proxies `/v1` and `/uploads` straight
to the API on whichever host is serving. One image runs anywhere, and CORS no
longer applies to the browser at all — `CORS_ORIGINS` now covers only the
extension and partner embeds.

`SITE_URL` moved the same way, from a build arg to a runtime variable read by
`app/src/lib/siteConfig.ts`, because robots.txt, sitemap.xml and the canonical
tags are all rendered server-side.

## Images

`.github/workflows/images.yml` builds `api` and `web` once per commit to `main`
and pushes them to ECR tagged with the commit SHA. Both hosts pull the same tag,
so promoting QA to production is a retag of an artifact that has already been
tested rather than a rebuild from a git ref on a different machine.

It also keeps builds off the hosts. They were building in place after a
`git pull`, and the production box has already hit `ENOSPC` doing it.

One-time AWS setup:

```bash
aws ecr create-repository --repository-name clearcaseiq-api
aws ecr create-repository --repository-name clearcaseiq-web
```

Then create an IAM role GitHub can assume via OIDC — no long-lived AWS keys in
GitHub secrets. Its trust policy must restrict the
`token.actions.githubusercontent.com` provider to this repository, or any repo
on GitHub can assume it. Set its ARN as the `AWS_ECR_ROLE_ARN` secret, alongside
`NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and
`NEXT_PUBLIC_BING_SITE_VERIFICATION`.

To deploy a published image, point the env file at it and pull rather than
build:

```bash
export REGISTRY=<account>.dkr.ecr.us-east-1.amazonaws.com
export TAG=<commit-sha>            # from the workflow's run summary

# In .env.prod / .env.qa:
#   API_IMAGE=$REGISTRY/clearcaseiq-api:$TAG
#   WEB_IMAGE=$REGISTRY/clearcaseiq-web:$TAG

aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY"
docker compose -f docker-compose.deploy.yml --env-file .env.prod pull
docker compose -f docker-compose.deploy.yml --env-file .env.prod up -d
```

Set the **same** `TAG` in both env files when promoting. The `build:` blocks are
still present and used only by `docker compose build`, which remains the local
and break-glass path.

### Why analytics is off outside production

The GA measurement id is a `NEXT_PUBLIC_*` value, so Next inlines it at build
time and one promotable image necessarily carries production's id everywhere it
runs. Left alone, QA would report its own test traffic into the production GA
property and quietly corrupt the numbers the site is measured on.

`SEARCH_ENGINE_INDEXING=disabled` therefore also clears `publicPage`, which is
what gates `SiteAnalytics`. Same rule as indexing: a deployment that is not the
public site does not behave as the public site.

## First-Time EC2 Setup

Install Docker, Docker Compose plugin, Nginx cert tooling helper, and Certbot:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git certbot
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Log out and back in after adding the Docker group.

## Environment

Create the env file for the environment this host serves:

```bash
cp .env.prod.example .env.prod   # or: cp .env.qa.example .env.qa
nano .env.prod
```

Set real secrets. Do not commit either file.

Do **not** build `.env.qa` by copying `.env.prod`. Two values are actively
dangerous carried over:

- `DATABASE_URL` — the API runs `prisma db push` on every boot, so QA holding
  production's URL pushes schema changes into production.
- `EMAIL_PROVIDER` — `EMAIL_PROVIDER=ses` *forces* SES even with no from-address
  set. Left empty (as in `.env.qa.example`), `resolveEmailProvider()` returns
  `none` and nothing is sent. That omission is the whole mechanism keeping QA
  from emailing real claimants, so it is worth confirming rather than assuming.

`JWT_SECRET` must also differ, or a token minted in QA is valid in production.

## SSL Certificate

Before starting the full SSL Nginx config, obtain a certificate. If ports 80/443 are free:

```bash
# Production host
sudo certbot certonly --standalone \
  -d clearcaseiq.com \
  -d www.clearcaseiq.com \
  -d api.clearcaseiq.com

# QA host
sudo certbot certonly --standalone \
  -d qa.clearcaseiq.com \
  -d api-qa.clearcaseiq.com
```

Certificates are stored under the first `-d` name, which is what the nginx
config for that environment expects:

```bash
/etc/letsencrypt/live/clearcaseiq.com/      # prod.conf
/etc/letsencrypt/live/qa.clearcaseiq.com/   # qa.conf
```

## Build and Start

```bash
export GIT_COMMIT=$(git rev-parse --short HEAD)
export BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose -f docker-compose.deploy.yml --env-file .env.prod build
docker compose -f docker-compose.deploy.yml --env-file .env.prod up -d
```

The two exports stamp both images with what they were built from, which the admin
System Status page then displays for the API. They are optional, but without them
that page cannot tell you whether a running container predates the commit you
just pulled — a stale image has been mistaken for a code bug more than once.

Build both services together, or check afterwards that they agree:

```bash
for s in api web; do
  echo "$s: $(docker compose -f docker-compose.deploy.yml --env-file .env.prod \
    exec -T $s printenv GIT_COMMIT)"
done
```

A web image older than the API is the worst of the two to miss, because it does
not look like a deploy problem at all. When the API began requiring a share
authorization the older bundle did not render its checkbox, so submitted cases
were held at the routing gate and simply never reached an attorney, with no error
on either side.

No manual Prisma step is needed. The API entrypoint runs `prisma db push` on
every start and **exits** if it fails, so the container will not serve traffic
against a schema it could not verify. The client is generated during the image
build. Set `ALLOW_SCHEMA_DRIFT=true` only as break-glass, to get a shell on a
box whose schema you are part-way through repairing.

If the container exits on boot, read the push output for the reason:

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.prod logs api | grep -A20 entrypoint
```

### When push refuses a change

`db push` classes a few safe changes as possibly destructive and stops rather
than guessing — most often **adding a unique constraint**, which it warns about
whether or not duplicates actually exist. The entrypoint does not pass
`--accept-data-loss`, because that flag would also wave through changes that
really do drop data on every future deploy.

Those changes live in `api/prisma/migrations/` as idempotent SQL files, applied
by hand once. Afterwards `db push` sees no difference and the container boots
normally. To apply one:

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.prod run --rm -T \
  --entrypoint sh api \
  -c 'node ../node_modules/prisma/build/index.js db execute --schema=prisma/schema.prisma --stdin' \
  < api/prisma/migrations/<folder>/migration.sql
```

Each file contains exactly what `schema.prisma` implies and nothing more. An
extra index added there would be dropped again by the next push.

## Database

Production uses managed Postgres (RDS). `DATABASE_URL` in `.env.prod` is
required — there is no local `db` service and no fallback, so a missing value
fails the stack immediately instead of silently pointing the API at an empty
database.

## Verify

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.prod ps
curl -s https://api.clearcaseiq.com/health/ready
curl -I https://www.clearcaseiq.com
curl -I https://clearcaseiq.com
```

`ps` must show `(healthy)` for both `api` and `web`. `/health/ready` runs real
queries and returns 503 listing the failing checks, unlike `/health`, which only
reports that the process is alive.

For the fuller picture, sign in as an admin and open **Admin → System Status**
(`/admin/system-status`). It reports the same readiness probes plus schema drift
against every model, the last run of each background job, recorded activity, the
running commit, and which integrations are configured. Since it is served by the
app, it cannot tell you the app is down — check `/health/ready` first when
nothing loads.

## Logs

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.prod logs -f nginx
docker compose -f docker-compose.deploy.yml --env-file .env.prod logs -f web
docker compose -f docker-compose.deploy.yml --env-file .env.prod logs -f api
```

## Redeploy

```bash
git pull
export GIT_COMMIT=$(git rev-parse --short HEAD)
export BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose -f docker-compose.deploy.yml --env-file .env.prod build
docker compose -f docker-compose.deploy.yml --env-file .env.prod up -d
```

Confirm the new build is live on **Admin → System Status**: the commit shown
there should match `git rev-parse --short HEAD`.

## AWS S3/Textract

Recommended: attach an IAM role to the EC2 instance with least-privilege access to:

- S3 bucket used by `S3_BUCKET`
- Textract `DetectDocumentText`

Do not store AWS access keys in git.
