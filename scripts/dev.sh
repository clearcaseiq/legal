#!/bin/bash

# Development startup script
echo "🚀 Starting Injury Intelligence in development mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup.sh first."
    exit 1
fi

# Start database if not running
if ! docker-compose ps db | grep -q "Up"; then
    echo "🐳 Starting database..."
    docker-compose up -d db
    sleep 5
fi

# Start API in background
echo "🔧 Starting API server..."
cd api
pnpm dev &
API_PID=$!
cd ..

# Start Web in background
echo "🌐 Starting web application..."
cd app
pnpm dev &
WEB_PID=$!
cd ..

echo "✅ Services started!"
echo ""
echo "Access the application at:"
echo "  Web: http://localhost:3000"
echo "  API: http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $API_PID $WEB_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait
