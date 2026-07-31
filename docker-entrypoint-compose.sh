#!/bin/bash
set -e

# Mirror all stdout/stderr to a log file so the maintenance page can expose
# the raw console output (via the maintenance server's /startup/logs
# endpoint) for debugging deploys that get stuck with no terminal access.
STARTUP_LOG="/tmp/changerawr-startup.log"
exec > >(tee "$STARTUP_LOG") 2>&1

# Plain-text step log the maintenance server reads directly off disk. Each
# line is one state transition for one step: STEP|STATE|MESSAGE|TIMESTAMP.
# Without this, the maintenance page has nothing to report and sits frozen
# at 0% for the entire setup phase.
STATUS_LOG="/tmp/changerawr-status-log"
: > "$STATUS_LOG"

# write_step STEP STATE MESSAGE
write_step() {
    printf '%s|%s|%s|%s\n' "$1" "$2" "$3" "$(date +%s)" >> "$STATUS_LOG"
}

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
write_step "prisma-generate" "running" "Generating Prisma client"
npx prisma generate
write_step "prisma-generate" "done" "Prisma client generated"

# Run database migrations
echo "🦖 Running database migrations..."
write_step "migrations" "running" "Running database migrations"
npx prisma migrate deploy
write_step "migrations" "done" "Database migrations complete"

# Run the widget build script
echo "🦖 Building widget..."
write_step "widget" "running" "Building widget"
npm run build:widget
write_step "widget" "done" "Widget built"

# Generate Swagger documentation
echo "🦖 Generating Swagger documentation..."
write_step "swagger" "running" "Generating API documentation"
npm run generate-swagger
write_step "swagger" "done" "API documentation generated"

# Generate extension imports
echo "🦖 Generating extension imports..."
write_step "extensions-generate" "running" "Preparing installed extensions"
npm run extensions:generate
write_step "extensions-generate" "done" "Extension imports regenerated"

# If any extensions are installed, the regenerated extensionLoader.ts (and the
# extensions' own source files) must be compiled into .next before `next start`
# can serve them - the image's prebuilt .next only has the default/empty loader.
if [ -n "$(find extensions -mindepth 2 -maxdepth 2 -type d 2>/dev/null)" ]; then
    echo "🦖 Installed extensions detected, rebuilding application..."
    write_step "rebuild" "running" "Rebuilding application with extensions (this can take several minutes)"
    CI_BUILD_MODE=1 DOCKER_BUILD=1 npm run build
    write_step "rebuild" "done" "Rebuild complete"
else
    echo "🦖 No installed extensions, skipping rebuild"
    write_step "rebuild" "skipped" "No installed extensions"
fi

# Stop maintenance server
echo "🦖 Setup complete! Stopping maintenance server..."
write_step "starting-app" "running" "Starting application services"
cleanup_maintenance

# Small delay to ensure port is released
sleep 1

# Execute the main application
echo "🦖 Starting main application..."
write_step "starting-app" "done" "Application services started"
write_step "ready" "done" "Application ready"
npm start