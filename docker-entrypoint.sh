#!/bin/bash
set -e

# Mirror all stdout/stderr to a log file so the maintenance page can expose
# the raw console output (via the builder service's /startup/logs endpoint)
# for debugging deploys that get stuck with no terminal access.
STARTUP_LOG="/tmp/changerawr-startup.log"
exec > >(tee "$STARTUP_LOG") 2>&1

echo "🦖 Starting Changerawr deployment..."

# Start Extension Builder Service first (needed for progress tracking)
echo "🦖 Starting Extension Builder Service..."
node scripts/extension-builder/server.js &
BUILDER_PID=$!

# Wait for builder service to be ready
sleep 2
echo "🦖 Extension Builder Service running (PID: $BUILDER_PID)"

# Helper function to report progress. Optional 4th arg is the log "type"
# ('info' | 'success' | 'warning' | 'error') so the maintenance page can
# visually flag non-fatal step failures instead of burying them in the raw
# console output.
report_progress() {
    local phase=$1
    local progress=$2
    local message=$3
    local type=${4:-info}
    # --max-time bounds the WHOLE request (connect + response). Without it, a
    # slow/unresponsive builder service (e.g. its event loop busy during the
    # CPU-heavy build step) can make curl hang forever - and since this runs
    # synchronously in the deploy pipeline, that freezes the entire deploy at
    # whatever percentage was last reported, with `|| true` masking the hang.
    curl -s -X POST http://localhost:3010/startup/update \
        --connect-timeout 2 --max-time 5 \
        -H "Content-Type: application/json" \
        -d "{\"phase\":\"$phase\",\"progress\":$progress,\"message\":\"$message\",\"type\":\"$type\"}" \
        >/dev/null 2>&1 || true
}

# Reset progress tracking
curl -s -X POST http://localhost:3010/startup/reset --connect-timeout 2 --max-time 5 >/dev/null 2>&1 || true

# Start maintenance server in the background
echo "🦖 Starting maintenance server..."
node scripts/maintenance/server.js &
MAINTENANCE_PID=$!
report_progress "maintenance" 5 "Maintenance server started"

# Function to cleanup maintenance server
cleanup_maintenance() {
    if [ -n "$MAINTENANCE_PID" ]; then
        echo "🦖 Stopping maintenance server..."
        kill $MAINTENANCE_PID 2>/dev/null || true
        # Don't wait - just kill and move on
    fi
}

# Trap to ensure maintenance server is cleaned up
trap cleanup_maintenance EXIT

# Give maintenance server a moment to start
sleep 2

echo "🦖 Maintenance server running (PID: $MAINTENANCE_PID)"
echo "🦖 Starting application setup..."

# Generate Prisma client
echo "🦖 Generating Prisma client..."
report_progress "prisma-generate" 10 "Generating Prisma client"
timeout 300 npx prisma generate

# Run database migrations
echo "🦖 Running database migrations..."
report_progress "migrations" 25 "Running database migrations"
timeout 300 npx prisma migrate deploy

# Run the widget build script. Non-fatal and time-bounded: a broken/hanging
# widget build must not prevent the whole application from starting.
echo "🦖 Building widget..."
report_progress "widget" 40 "Building widget components"
timeout 180 npm run build:widget && widget_status=0 || widget_status=$?
if [ "$widget_status" -ne 0 ]; then
    echo "⚠️  Widget build failed or timed out (exit $widget_status) - continuing without it"
    report_progress "widget" 40 "Widget build failed or timed out - continuing without it" "warning"
fi

# Generate Swagger documentation. Non-fatal and time-bounded for the same
# reason as the widget build above.
echo "🦖 Generating Swagger documentation..."
report_progress "swagger" 55 "Generating API documentation"
timeout 180 npm run generate-swagger && swagger_status=0 || swagger_status=$?
if [ "$swagger_status" -ne 0 ]; then
    echo "⚠️  Swagger generation failed or timed out (exit $swagger_status) - continuing without it"
    report_progress "swagger" 55 "Swagger generation failed or timed out - continuing without it" "warning"
fi

# Generate extension imports + Tailwind safelist. This step has repeatedly
# gotten the whole deploy stuck: with `set -e`, any failure here (or a hang
# that runs past the timeout) used to abort the entire entrypoint script,
# which - depending on the container's restart policy - can make the deploy
# loop forever, always dying at this same point. Treat it as best-effort:
# the app can run with the existing/default extensionLoader if this fails.
echo "🦖 Generating extension imports..."
report_progress "extensions" 70 "Generating extension imports"
timeout 180 npm run extensions:generate && extensions_status=0 || extensions_status=$?
if [ "$extensions_status" -ne 0 ]; then
    extensions_ok=false
    echo "⚠️  Extension import/safelist generation failed or timed out (exit $extensions_status) - continuing with existing extensionLoader"
    report_progress "extensions" 70 "Extension generation failed or timed out - continuing with existing extensions" "warning"
else
    extensions_ok=true
fi
report_progress "extensions" 77 "Finished extension import generation"

# If any extensions are installed AND the imports/safelist generation above
# succeeded, the regenerated extensionLoader.ts (and the extensions' own
# source files) must be compiled into .next before `next start` can serve
# them - the image's prebuilt .next only has the default/empty loader.
if [ "$extensions_ok" = true ] && [ -n "$(find extensions -mindepth 2 -maxdepth 2 -type d 2>/dev/null)" ]; then
    echo "🦖 Installed extensions detected, rebuilding application..."
    report_progress "build" 78 "Rebuilding application with installed extensions"

    # Pipe the build output so we can report fine-grained progress as
    # Next.js moves through its own build phases. `set -o pipefail` ensures
    # the pipeline's exit status reflects `npm run build`, not the `while` loop.
    # `timeout` bounds the whole build so a Turbopack hang can't stall the
    # deploy forever - if it times out, `build_status` will be non-zero (124).
    set -o pipefail
    CI_BUILD_MODE=1 DOCKER_BUILD=1 timeout 1800 npm run build 2>&1 | while IFS= read -r line; do
        echo "$line"
        case "$line" in
            *"Creating an optimized production build"*)
                report_progress "build" 79 "Creating an optimized production build"
                ;;
            *"Compiled successfully"*)
                report_progress "build" 81 "Build compiled successfully"
                ;;
            *"Collecting page data"*)
                report_progress "build" 82 "Collecting page data"
                ;;
            *"Generating static pages"*)
                report_progress "build" 83 "Generating static pages"
                ;;
            *"Finalizing page optimization"*)
                report_progress "build" 84 "Finalizing page optimization"
                ;;
        esac
    done
    build_status=$?
    set +o pipefail

    if [ "$build_status" -ne 0 ]; then
        echo "❌ Application rebuild failed or timed out (exit $build_status)"
        report_progress "build" 78 "Application rebuild failed or timed out (exit $build_status)" "error"
        exit 1
    fi
elif [ "$extensions_ok" = false ]; then
    echo "🦖 Skipping rebuild (extension generation failed above)"
else
    echo "🦖 No installed extensions, skipping rebuild"
fi

# Stop maintenance server
echo "🦖 Setup complete! Stopping maintenance server..."
report_progress "starting-app" 85 "Starting Next.js application"
cleanup_maintenance

# Small delay to ensure port is released
sleep 1

# Clean up any leftover domain configs from previous runs that might reference missing certs
echo "🦖 Cleaning up any stale domain configs..."
rm -f /etc/nginx/sites-enabled/*.conf 2>/dev/null || true
echo "🦖 Cleaned up $(ls -1 /etc/nginx/sites-enabled/*.conf 2>/dev/null | wc -l) domain configs"

# Test and start nginx in daemon mode (background)
echo "🦖 Testing nginx configuration..."
if ! nginx -t 2>&1; then
    echo "❌ nginx configuration test failed even after cleanup!"
    echo "🦖 Last chance: nuking cert directory and retrying..."

    # Nuclear option: remove all certs and configs
    rm -rf /etc/ssl/changerawr/* 2>/dev/null || true
    rm -f /etc/nginx/sites-enabled/*.conf 2>/dev/null || true

    if ! nginx -t 2>&1; then
        echo "❌ nginx configuration is fundamentally broken, exiting..."
        exit 1
    fi
    echo "✅ nginx configuration fixed after nuclear cleanup!"
fi

echo "🦖 Starting nginx..."
nginx 2>&1
if [ $? -eq 0 ]; then
    echo "🦖 nginx started successfully"
else
    echo "⚠️  nginx failed to start, continuing without nginx..."
fi

# Start nginx-agent if SSL is enabled
if [ "$NEXT_PUBLIC_SSL_ENABLED" = "true" ]; then
    echo "🦖 Starting nginx-agent..."
    if [ -d /nginx-agent ]; then
        cd /nginx-agent

        # Set agent environment variables
        export AGENT_SECRET="${NGINX_AGENT_SECRET}"
        export CHANGERAWR_URL="http://127.0.0.1:3000"
        export INTERNAL_API_SECRET="${INTERNAL_API_SECRET}"
        export AGENT_PORT="${NGINX_AGENT_PORT:-7842}"
        export CERT_DIR="/etc/ssl/changerawr"
        export NGINX_DIR="/etc/nginx/sites-enabled"
        export NGINX_RELOAD_CMD="/usr/local/bin/nginx-reload.sh"

        # Make sure agent doesn't try to bind to port 80
        npm start 2>&1 &
        NGINX_AGENT_PID=$!
        echo "🦖 nginx-agent running (PID: $NGINX_AGENT_PID)"
        cd /app
    else
        echo "⚠️  nginx-agent directory not found, skipping..."
    fi
else
    echo "🦖 SSL not enabled, skipping nginx-agent..."
fi

# Start Next.js application in background
echo "🦖 Starting Next.js application on port 3000..."
# Ensure Next.js uses port 3000
export PORT=3000
export HOSTNAME="0.0.0.0"
"$@" &
APP_PID=$!
echo "🦖 Next.js running (PID: $APP_PID)"
report_progress "ready" 100 "Application ready"
curl -s -X POST http://localhost:3010/startup/complete --connect-timeout 2 --max-time 5 >/dev/null 2>&1 || true

# Function to handle shutdown gracefully
shutdown() {
    echo "🦖 Shutting down..."

    # Stop Next.js
    if [ -n "$APP_PID" ]; then
        echo "🦖 Stopping Next.js (PID: $APP_PID)..."
        kill -TERM "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi

    # Stop Extension Builder Service
    if [ -n "$BUILDER_PID" ]; then
        echo "🦖 Stopping Extension Builder Service (PID: $BUILDER_PID)..."
        kill -TERM "$BUILDER_PID" 2>/dev/null || true
        wait "$BUILDER_PID" 2>/dev/null || true
    fi

    # Stop nginx-agent
    if [ -n "$NGINX_AGENT_PID" ]; then
        echo "🦖 Stopping nginx-agent (PID: $NGINX_AGENT_PID)..."
        kill -TERM "$NGINX_AGENT_PID" 2>/dev/null || true
        wait "$NGINX_AGENT_PID" 2>/dev/null || true
    fi

    # Stop nginx
    echo "🦖 Stopping nginx..."
    nginx -s quit 2>/dev/null || true

    # The captured startup log has served its purpose (debugging a stuck/slow
    # deploy via the maintenance page). Keep it around for the whole container
    # lifetime so it stays available while Next.js boots and runs, only
    # removing it now as part of shutdown.
    rm -f "$STARTUP_LOG"

    echo "🦖 Shutdown complete"
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown SIGTERM SIGINT

# Wait for Next.js process (keeps container alive)
echo "🦖 All services started. Waiting for Next.js process..."
wait "$APP_PID"

# If Next.js exits, trigger shutdown
echo "🦖 Next.js process exited"
shutdown