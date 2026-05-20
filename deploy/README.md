# ClearCaseIQ Production Deployment

This deployment runs ClearCaseIQ on one EC2 host with Docker Compose:

- `web`: Next.js frontend on internal port `3000`
- `api`: Express API on internal port `4000`
- `db`: PostgreSQL + pgvector
- `nginx`: public reverse proxy for SSL and routing

Public hosts:

- `https://www.clearcaseiq.com` -> Next.js frontend
- `https://clearcaseiq.com` -> redirects to `www`
- `https://api.clearcaseiq.com` -> Express API

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

Create production env file:

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Set real secrets. Do not commit `.env.prod`.

## SSL Certificate

Before starting the full SSL Nginx config, obtain a certificate. If ports 80/443 are free:

```bash
sudo certbot certonly --standalone \
  -d clearcaseiq.com \
  -d www.clearcaseiq.com \
  -d api.clearcaseiq.com
```

Certificates will be stored under:

```bash
/etc/letsencrypt/live/clearcaseiq.com/
```

## Build and Start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Run Prisma setup after the API image is built and DB is healthy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api pnpm prisma:generate
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api node ../node_modules/prisma/build/index.js db push
```

## Verify

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
curl -I https://www.clearcaseiq.com
curl -I https://clearcaseiq.com
curl -I https://api.clearcaseiq.com
```

## Logs

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f nginx
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f web
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api
```

## Redeploy

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## AWS S3/Textract

Recommended: attach an IAM role to the EC2 instance with least-privilege access to:

- S3 bucket used by `S3_BUCKET`
- Textract `DetectDocumentText`

Do not store AWS access keys in git.
