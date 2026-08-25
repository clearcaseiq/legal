# ClearCaseIQ Deployment

Each environment runs on one EC2 host with Docker Compose:

- `web`: Next.js frontend on internal port `3000`
- `api`: Express API on internal port `4000`
- `nginx`: reverse proxy and routing

Postgres is managed (RDS), not a container. See [Database](#database).

## Production topology

```
Route 53  ->  ALB (ACM certificate)  ->  EC2: nginx -> web / api  ->  RDS (Multi-AZ)
                                                                 \->  S3 (uploads)
```

Production sits behind an Application Load Balancer; QA still faces the internet
directly. The differences that matter when reading anything below:

| | Production | QA |
| --- | --- | --- |
| TLS terminates at | the ALB, with an ACM certificate | nginx, with Let's Encrypt |
| nginx listens on | 80 only, no key material | 80 and 443 |
| Reachable directly | no — the instance only accepts port 80 from the ALB | yes |
| Certificate renewal | automatic, no host involvement | certbot on a systemd timer, renewing over the webroot |

TLS moved off the host because the certificates were issued with
`certbot --standalone`, which needs ports 80 and 443 free to answer the
challenge, and nginx holds both. Renewal could not have succeeded: it would have
failed quietly and taken the site down roughly 90 days after issue. ACM renews
itself, so the failure mode is gone rather than patched.

**QA hit exactly that wall and has been fixed in place.** It still terminates
its own TLS, but renews over the webroot `qa.conf` already served rather than by
binding the ports nginx holds. See [SSL Certificate](#ssl-certificate).

The ALB is also what makes a second instance possible. That was not true until
uploads moved to S3 — with files on one box's disk, a second instance would have
served 404s for half of them regardless of what sat in front.

## Reaching the database

The production instance is **not publicly accessible**, so a direct connection
from a laptop no longer works no matter what the security group says. Tunnel
through the EC2 host over SSM instead — no bastion, no inbound SSH, and the
session is attributed in CloudTrail:

```bash
aws ssm start-session \
  --target i-04eb8893cb09f1222 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["<rds-endpoint>"],"portNumber":["5432"],"localPortNumber":["5432"]}'
```

Then connect to `localhost:5432` as usual. Leave the instance private; the point
is that a future security-group edit cannot expose it, because there is nothing
to expose.

## Monitoring

Alarms publish to the `clearcaseiq-prod-alerts` SNS topic. **A subscription only
delivers once its confirmation link is clicked** — an unconfirmed subscription
looks configured in the console and delivers nothing.

Host memory and disk come from the CloudWatch agent, configured from the SSM
parameter `/clearcaseiq/cloudwatch-agent-config`. Those two alarms treat missing
data as `missing` rather than `notBreaching`, so they read `INSUFFICIENT_DATA`
if the agent stops. That is deliberate: with `notBreaching` they sat at `OK`
while the agent was failing to parse its config and reporting nothing at all,
which is worse than having no alarm, because it answers the question "are we
watching memory?" with a confident yes.

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

## How a change reaches production

`.github/workflows/pipeline.yml` runs four stages on every push to `main`:

```
test  ->  build images  ->  deploy QA  ->  [approval]  ->  deploy production
```

Each stage `needs:` the one before it, so a failing test suite stops the line
rather than running beside it. That connection is the point. `ci.yml` and
`images.yml` used to be separate workflows on the same trigger, which meant a
commit that failed its tests was still built and published to ECR ready to
deploy — the gate existed and gated nothing.

Only one step is manual. The `production` environment carries a required
reviewer, so the last job waits for a human to approve it in the Actions UI.
What it then deploys is the image QA just ran, byte for byte, identified by
commit SHA. Promotion is never a rebuild, so "it worked in QA" is a claim about
the artifact rather than about a second build of the same source.

Nothing is built on a host any more. They built in place after a `git pull`, and
the production box has already hit `ENOSPC` doing it. Hosts now only pull.

To deploy an arbitrary tag — a rollback, or a redeploy without a new commit — run
the **Deploy a specific tag** workflow. It checks that both images exist for that
tag before touching the host, and deploying to production through it needs the
same approval, since a rollback that skips review is a way to ship unreviewed
code by calling it a rollback.

### Deploying to a host

`deploy/deploy.sh <prod|qa> <tag>` does the work, on the host, in both the
automated and manual paths:

```bash
cd ~/clearcaseiq/legal        # production; QA path may differ
git fetch --all && git checkout --detach <sha>
bash deploy/deploy.sh prod <sha>
```

It records the currently deployed tag, writes the new one into `API_IMAGE` and
`WEB_IMAGE`, pulls, starts, and waits for both containers to report healthy. If
they do not, it puts the previous tag back and exits non-zero.

Both images come from one tag argument, which is what makes it structurally
impossible to run a web bundle against a different commit's API. That mismatch is
the worst failure this deployment has, because it does not present as a deploy
problem: when the API began requiring a share authorization, the older bundle
just did not render the checkbox, and submitted cases were held at the routing
gate and never reached an attorney, with no error on either side.

The automated path reaches the host through **SSM Run Command**, not SSH. There
is no inbound 22 to open to GitHub's runner ranges, no private key in repository
secrets, and every invocation is attributed in CloudTrail to the run that caused
it. It also survives moving the hosts into a private subnet.

## Images

One-time AWS setup, already applied to account `302524629649`. It is written out
in full because the first attempt set the `AWS_ECR_ROLE_ARN` secret without
creating the provider or the role behind it, and every run then failed with
`the web identity token provided could not be validated`.

```bash
aws ecr create-repository --repository-name clearcaseiq-api \
  --image-scanning-configuration scanOnPush=true
aws ecr create-repository --repository-name clearcaseiq-web \
  --image-scanning-configuration scanOnPush=true

# The provider is the step that is easy to miss. Without it the role's trust
# policy references a federated principal that does not exist, and the failure
# surfaces at token exchange rather than at role creation.
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com

aws iam create-role --role-name clearcaseiq-gha-ecr \
  --assume-role-policy-document file://trust-policy.json
aws iam put-role-policy --role-name clearcaseiq-gha-ecr \
  --policy-name ecr-push --policy-document file://ecr-push.json

gh secret set AWS_ECR_ROLE_ARN \
  --body arn:aws:iam::302524629649:role/clearcaseiq-gha-ecr
```

The trust policy restricts the provider to this repository — otherwise any repo
on GitHub can assume the role — and to `refs/heads/*`, which additionally
excludes pull requests, including those opened from forks:

```json
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
  },
  "StringLike": {
    "token.actions.githubusercontent.com:sub": "repo:clearcaseiq/legal:ref:refs/heads/*"
  }
}
```

AWS no longer requires a thumbprint for GitHub's issuer, so `--thumbprint-list`
is omitted; older runbooks that pin a certificate fingerprint are describing a
requirement that no longer exists.

`AWS_ECR_ROLE_ARN` sits alongside `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and `NEXT_PUBLIC_BING_SITE_VERIFICATION`.

Both instance roles carry an `ecr-pull` policy granting read on these two
repositories, which is what lets the hosts pull what this workflow publishes.

Each image is tagged with the **full** commit SHA, and a `main` tag moves along
with the latest. Always deploy the SHA. `main` is a moving target, so two hosts
pulling it a day apart run different code while appearing to run the same thing.

### The deploy role

Deploys assume a second role, `clearcaseiq-gha-deploy`, whose only privileges are
`ssm:SendCommand` against the two instance IDs and the `AWS-RunShellScript`
document. Its trust policy is scoped to the environment claim rather than the
repository:

```json
"token.actions.githubusercontent.com:sub": [
  "repo:clearcaseiq/legal:environment:qa",
  "repo:clearcaseiq/legal:environment:production"
]
```

So the credentials that can reach a host are obtainable only from a job running
in one of those two environments, and the production one is approval-gated. A
workflow added on a branch cannot assume it.

The instance roles carry `AmazonSSMManagedInstanceCore`, which is what lets the
agent register and receive commands, alongside the `ecr-pull` policy that lets
them retrieve what the pipeline publishes.

`API_IMAGE` and `WEB_IMAGE` are required, not defaulted. They used to fall back
to `clearcaseiq-api:local` — an image that exists only where one was built — so a
host missing the variable failed at pull time complaining about a tag nobody set
instead of naming the variable that was absent. Set them by hand only for a
break-glass `docker compose build`, where any local value will do.

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

Then clone the repository. Every command below runs from inside it: the compose
file, the per-environment nginx configs it mounts and the certbot webroot are
all in the checkout, so a host without one has nothing to run even when the
images are already published.

```bash
cd ~
git clone https://github.com/clearcaseiq/legal.git
cd legal
```

The directory is `legal`, lowercase.

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

**Production no longer uses certbot.** TLS terminates at the ALB with an ACM
certificate covering `clearcaseiq.com`, `www` and `api`, which renews itself.
There is nothing to run on the host and nothing to remember before expiry.

QA still issues its own, and this is where the `--standalone` trap lives. It
binds ports 80 and 443 to answer the challenge, so it works exactly once —
during first setup, before nginx exists — and then fails at every renewal
afterwards, because nginx holds both ports from then on.

QA was in precisely that state: `authenticator = standalone` recorded in its
renewal config, a systemd timer firing twice a day, and every run failing with
`Could not bind TCP port 80 because it is already in use`. Nothing surfaced it.
The timer reported no errors anywhere a person would look, and the certificate
stayed valid, so the only symptom would have been the site going dark about 90
days after issue.

It now renews over the webroot that `qa.conf` has served all along, which needs
no ports:

```ini
# /etc/letsencrypt/renewal/qa.clearcaseiq.com.conf
authenticator = webroot
webroot_path = /home/ubuntu/clearcaseiq/legal/deploy/certbot/www,
renew_hook = docker exec clearcaseiq-qa-nginx nginx -s reload
```

The `renew_hook` matters as much as the authenticator. nginx reads its
certificate once at startup, so without a reload it would keep serving the old
one after a successful renewal — the same silent expiry, reached by a different
route.

Verify a change here rather than trusting it, because every failure mode in this
area is quiet:

```bash
sudo certbot renew --dry-run
```

That performs a real HTTP-01 challenge against the running nginx. Expect
`Congratulations, all simulated renewals succeeded`. It takes several minutes:
`certbot renew` sleeps a random delay of up to ~8 minutes to spread load on
Let's Encrypt, which looks like a hang and is not. Pass
`--no-random-sleep-on-renew` when running it by hand.

**First issue on a new host**, where no nginx is running yet and the ports are
genuinely free:

```bash
sudo certbot certonly --standalone \
  -d qa.clearcaseiq.com \
  -d api-qa.clearcaseiq.com
```

Immediately afterwards, switch that certificate's `authenticator` to `webroot`
as above. Otherwise the host inherits the same buried failure.

Certificates are stored under the first `-d` name, which is what `qa.conf`
expects:

```bash
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

Normally you do not. Pushing to `main` deploys QA automatically and offers
production for approval; see [How a change reaches
production](#how-a-change-reaches-production).

To put a specific tag on a host outside that flow, use the **Deploy a specific
tag** workflow, or run the same script the pipeline runs:

```bash
cd ~/clearcaseiq/legal
git fetch --all && git checkout --detach <sha>
bash deploy/deploy.sh prod <sha>
```

Building on the host remains available as break-glass, but prefer deploying a
published image: the build is what has hit `ENOSPC` here before, and an image
built on the box is not the artifact QA tested.

Confirm what is live on **Admin → System Status**: the commit shown there is
stamped into the image at build time, so it reports what is actually running
rather than what the checkout says.

## AWS S3/Textract

Each host has an instance role rather than access keys, and each role's
`clearcaseiq-app` policy grants SES, SNS, Textract and S3 on that environment's
bucket only:

| Environment | Instance role         | `S3_BUCKET`                |
| ----------- | --------------------- | -------------------------- |
| Production  | `clearcaseiq-ec2-role` | `clearcaseiq-prod-uploads` |
| QA          | `clearcaseiq-qa-ec2`   | `clearcaseiq-qa-uploads`   |

Both buckets block all public access, default to AES256 encryption at rest and
have versioning enabled, so an accidental delete of an executed retainer or a
medical record is recoverable.

The S3 grant must name a real bucket. The production policy shipped with a
literal `arn:aws:s3:::YOUR_BUCKET` for some time, which meant `FILE_BUCKET=s3`
would have failed every upload with `AccessDenied` the moment it was switched
on. If uploads start returning 503 with a storage error, check this policy
before anything else.

Do not store AWS access keys in git.
