#!/bin/bash
set -e

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Run the widget build script
echo "Building widget..."
npm run build:widget

# Generate Swagger documentation
echo "Generating Swagger documentation..."
npm run generate-swagger

# Execute the command passed to the entrypoint
echo "Starting application..."
exec "$@"