#!/bin/bash
set -e

# Mirror all stdout/stderr to a log file so the maintenance page can expose
# the raw console output (via the maintenance server's /startup/logs
# endpoint) for debugging deploys that get stuck with no terminal access.
STARTUP_LOG="/tmp/changerawr-startup.log"
exec > >(tee "$STARTUP_LOG") 2>&1

# Plain-text status file the maintenance server reads directly off disk.
# No HTTP service, no curl, no JSON server is involved in reporting boot
# progress - just a file write.
STATUS_FILE="/tmp/changerawr-status"
STATUS_LOG="/tmp/changerawr-status-log"
: > "$STATUS_LOG"

# write_status PHASE PROGRESS MESSAGE [TYPE]
# TYPE is one of info|success|warning|error (default info) and is used by the
# maintenance page to color-code individual log lines.
write_status() {
    local type="${4:-info}"
    local line="$1|$2|$3|$(date +%s)|$type"
    printf '%s\n' "$line" > "${STATUS_FILE}.tmp"
    mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    printf '%s\n' "$line" >> "$STATUS_LOG"
}

echo "🦖 Starting Changerawr deployment..."
write_status "starting" 0 "Starting Changerawr"

# Start the Extension Builder Service early as a long-running background
# service (lazy-Prisma, so it's safe before `prisma generate` below). It is
# not on the critical path for boot progress - it just needs to be up by the
# time Next.js's instrumentation (app/startup.ts) checks for it on port 3010,
# so it doesn't spawn a second instance.
echo "🦖 Starting Extension Builder Service..."
node scripts/extension-builder/server.js > /tmp/changerawr-builder.log 2>&1 &
BUILDER_PID=$!

# Start maintenance server in the background. This is the ONLY thing
# blocking startup waits on for UI - it's a tiny static HTTP server with no
# dependencies on Prisma, the extension builder, or anything else that could
# fail to come up.
echo "🦖 Starting maintenance server..."
node scripts/maintenance/server.js &
MAINTENANCE_PID=$!

cleanup_maintenance() {
    if [ -n "$MAINTENANCE_PID" ]; then
        echo "🦖 Stopping maintenance server..."
        kill $MAINTENANCE_PID 2>/dev/null || true
    fi
}
trap cleanup_maintenance EXIT

sleep 1
echo "🦖 Maintenance server running (PID: $MAINTENANCE_PID)"

# ---------------------------------------------------------------------------
# BLOCKING PHASE - everything the maintenance page waits on. Nothing starts
# (nginx, Next.js) until this entire phase finishes. Steps that aren't
# strictly required for the app to run (widget, swagger, extension imports)
# are timeout-bounded and non-fatal so a transient failure there can't hang
# the deploy forever; the extension-aware rebuild is also timeout-bounded as
# a last-resort safety net, but is expected to complete normally every time.
# ---------------------------------------------------------------------------

echo "🦖 Generating Prisma client..."
write_status "prisma-generate" 10 "Generating Prisma client"
timeout 300 npx prisma generate

echo "🦖 Running database migrations..."
write_status "migrations" 30 "Running database migrations"
timeout 300 npx prisma migrate deploy

echo "🦖 Building widget..."
write_status "widget" 45 "Building widget"
if timeout 180 npm run build:widget; then
    echo "✅ Widget build complete"
else
    echo "⚠️  Widget build failed or timed out - continuing without it"
    write_status "widget" 45 "Widget build failed - continuing without it" "warning"
fi

echo "🦖 Generating Swagger documentation..."
write_status "swagger" 60 "Generating API documentation"
if timeout 180 npm run generate-swagger; then
    echo "✅ Swagger documentation generated"
else
    echo "⚠️  Swagger generation failed or timed out - continuing without it"
    write_status "swagger" 60 "Swagger generation failed - continuing without it" "warning"
fi

if [ -n "$(find extensions -mindepth 2 -maxdepth 2 -type d 2>/dev/null)" ]; then
    echo "🦖 Installed extensions detected - regenerating imports..."
    write_status "extensions-generate" 70 "Preparing installed extensions"
    if timeout 180 npm run extensions:generate; then
        echo "✅ Extension imports regenerated - rebuilding application..."
        write_status "rebuild" 75 "Rebuilding application with extensions (this can take several minutes)"
        if CI_BUILD_MODE=1 DOCKER_BUILD=1 timeout 1800 npm run build; then
            echo "✅ Rebuild complete"
            write_status "rebuild" 95 "Rebuild complete"
        else
            echo "⚠️  Rebuild failed or timed out (exit $?) - extensions unavailable until next deploy"
            write_status "rebuild" 95 "Extension rebuild failed - continuing without new extensions" "error"
        fi
    else
        echo "⚠️  Extension import/safelist generation failed or timed out - continuing with existing extensionLoader"
        write_status "extensions-generate" 95 "Extension import generation failed - continuing without changes" "warning"
    fi
else
    echo "🦖 No installed extensions, nothing to rebuild"
    write_status "extensions-generate" 95 "No installed extensions"
fi

echo "🦖 Setup complete! Stopping maintenance server..."
write_status "starting-app" 97 "Starting Next.js application"
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
export PORT=3000
export HOSTNAME="0.0.0.0"
"$@" &
APP_PID=$!
echo "🦖 Next.js running (PID: $APP_PID)"
write_status "ready" 100 "Application ready"

# Function to handle shutdown gracefully
shutdown() {
    echo "🦖 Shutting down..."

    # Stop Next.js
    if [ -n "$APP_PID" ]; then
        echo "🦖 Stopping Next.js (PID: $APP_PID)..."
        kill -TERM "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi

    # Stop nginx-agent
    if [ -n "$NGINX_AGENT_PID" ]; then
        echo "🦖 Stopping nginx-agent (PID: $NGINX_AGENT_PID)..."
        kill -TERM "$NGINX_AGENT_PID" 2>/dev/null || true
        wait "$NGINX_AGENT_PID" 2>/dev/null || true
    fi

    # Stop Extension Builder Service
    if [ -n "$BUILDER_PID" ]; then
        echo "🦖 Stopping Extension Builder Service (PID: $BUILDER_PID)..."
        kill -TERM "$BUILDER_PID" 2>/dev/null || true
        wait "$BUILDER_PID" 2>/dev/null || true
    fi

    # Stop nginx
    echo "🦖 Stopping nginx..."
    nginx -s quit 2>/dev/null || true

    # The captured startup log has served its purpose (debugging a stuck/slow
    # deploy via the maintenance page). Keep it around for the whole container
    # lifetime so it stays available while Next.js boots and runs, only
    # removing it now as part of shutdown.
    rm -f "$STARTUP_LOG" "$STATUS_FILE" "$STATUS_LOG"

    echo "🦖 Shutdown complete"
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown SIGTERM SIGINT

# Wait for the Next.js process and exit when it does
echo "🦖 All services started. Waiting for Next.js process..."
wait "$APP_PID" && APP_EXIT=0 || APP_EXIT=$?
echo "🦖 Next.js process exited (code $APP_EXIT)"
shutdown
