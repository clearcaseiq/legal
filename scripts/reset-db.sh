#!/bin/bash

# Database reset script
echo "🗄️ Resetting Injury Intelligence database..."

# Check if database is running
if ! docker-compose ps db | grep -q "Up"; then
    echo "🐳 Starting database..."
    docker-compose up -d db
    sleep 10
fi

echo "⚠️  This will delete all data in the database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Dropping and recreating database..."
    cd api
    
    # Reset database
    pnpm prisma migrate reset --force
    
    echo "🌱 Seeding database..."
    pnpm prisma db seed
    
    echo "✅ Database reset complete!"
else
    echo "❌ Database reset cancelled"
fi

cd ..
