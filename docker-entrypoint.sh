#!/bin/bash
set -e

echo "🦖 Starting Changerawr deployment..."

# Start maintenance server in the background
echo "🦖 Starting maintenance server..."
node scripts/maintenance/server.js &
MAINTENANCE_PID=$!

# Function to cleanup maintenance server
cleanup_maintenance() {
    echo "🦖 Stopping maintenance server..."
    kill $MAINTENANCE_PID 2>/dev/null || true
    wait $MAINTENANCE_PID 2>/dev/null || true
}

# Trap to ensure maintenance server is cleaned up
trap cleanup_maintenance EXIT

# Give maintenance server a moment to start
sleep 2

echo "🦖 Maintenance server running (PID: $MAINTENANCE_PID)"
echo "🦖 Starting application setup..."

# Generate Prisma client
echo "🦖 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🦖 Running database migrations..."
npx prisma migrate deploy

# Run the widget build script
echo "🦖 Building widget..."
npm run build:widget

# Generate Swagger documentation
echo "🦖 Generating Swagger documentation..."
npm run generate-swagger

# Stop maintenance server
echo "🦖 Setup complete! Stopping maintenance server..."
cleanup_maintenance

# Small delay to ensure port is released
sleep 1

# Execute the main application
echo "🦖 Starting main application..."
exec "$@"