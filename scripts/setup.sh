#!/bin/bash
set -euo pipefail

# ClearCaseIQ / Injury Intelligence setup (macOS, Linux, Git Bash on Windows)
# Windows users: prefer docs/WINDOWS_SETUP.md or scripts/setup.ps1

echo "Setting up ClearCaseIQ..."

if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Install Docker Desktop first."
    exit 1
fi

if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "Docker Compose is not available. Install Docker Desktop (includes compose)."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "pnpm is not installed. Run: corepack enable && corepack prepare pnpm@8.15.6 --activate"
    exit 1
fi

echo "Creating directories..."
mkdir -p uploads logs

echo "Configuring API environment..."
if [ ! -f api/.env ]; then
    cp api/.env.example api/.env
    echo "Created api/.env from api/.env.example"
else
    echo "api/.env already exists"
fi

echo "Configuring web environment..."
if [ ! -f app/.env.local ]; then
    cp app/.env.example app/.env.local
    echo "Created app/.env.local from app/.env.example"
else
    echo "app/.env.local already exists"
fi

echo "Starting PostgreSQL..."
$DOCKER_COMPOSE up -d db

echo "Waiting for database..."
sleep 10

echo "Installing dependencies (workspace root)..."
pnpm install

echo "Generating Prisma client and applying migrations..."
cd api
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed
cd ..

echo "Setup complete."
echo ""
echo "Start development:"
echo "  pnpm dev"
echo "  # or: ./scripts/start-dev.ps1 on Windows"
echo ""
echo "URLs:"
echo "  Web: http://localhost:3000"
echo "  API: http://localhost:4000/v1/auth/health"
echo "  DB:  localhost:5432 (PostgreSQL)"
