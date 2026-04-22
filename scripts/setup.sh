#!/bin/bash

# Injury Intelligence Setup Script
echo "🚀 Setting up Injury Intelligence..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p logs

echo "📋 Copying environment file..."
if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please review and update .env file with your configuration"
else
    echo "✅ .env file already exists"
fi

echo "🐳 Starting Docker services..."
docker-compose up -d db

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "📦 Installing dependencies..."
cd api && pnpm install
cd ../app && pnpm install
cd ..

echo "🗄️  Setting up database..."
cd api
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed
cd ..

echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "  docker-compose up"
echo ""
echo "Or start individual services:"
echo "  cd api && pnpm dev    # API server"
echo "  cd app && pnpm dev    # Web frontend"
echo ""
echo "Access the application at:"
echo "  Web: http://localhost:3000"
echo "  API: http://localhost:4000"
echo "  Database: localhost:5432"
