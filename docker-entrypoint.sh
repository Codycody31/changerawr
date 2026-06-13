#!/bin/bash
set -e

# Mirror all stdout/stderr to a log file so the maintenance page can expose
# the raw console output (via the maintenance server's /startup/logs
# endpoint) for debugging deploys that get stuck with no terminal access.
STARTUP_LOG="/tmp/changerawr-startup.log"
exec > >(tee "$STARTUP_LOG") 2>&1

# Plain-text status file the maintenance server reads directly off disk.
# This is the whole "different approach": no HTTP service, no curl, no JSON
# server is involved in reporting boot progress anymore - just a file write.
STATUS_FILE="/tmp/changerawr-status"
STATUS_LOG="/tmp/changerawr-status-log"
: > "$STATUS_LOG"

# write_status PHASE PROGRESS MESSAGE
write_status() {
    local line="$1|$2|$3|$(date +%s)"
    printf '%s\n' "$line" > "${STATUS_FILE}.tmp"
    mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
    printf '%s\n' "$line" >> "$STATUS_LOG"
}

echo "🦖 Starting Changerawr deployment..."
write_status "starting" 0 "Starting Changerawr"

# Start the Extension Builder Service early as a long-running background
# service (lazy-Prisma, so it's safe before `prisma generate` below). It is
# NOT on the critical path for boot progress anymore - it just needs to be up
# by the time Next.js's instrumentation (app/startup.ts) checks for it on
# port 3010, so it doesn't spawn a second instance.
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
# BLOCKING PHASE - this is everything the maintenance page waits on.
# Deliberately minimal: just the two things the app cannot run without.
# Everything else (widget, swagger, extensions, extension-aware rebuild) has
# been moved to a background phase below so it can NEVER make the deploy
# "stuck" again - the app starts as soon as the database is ready.
# ---------------------------------------------------------------------------

echo "🦖 Generating Prisma client..."
write_status "prisma-generate" 20 "Generating Prisma client"
timeout 300 npx prisma generate

echo "🦖 Running database migrations..."
write_status "migrations" 60 "Running database migrations"
timeout 300 npx prisma migrate deploy

echo "🦖 Setup complete! Stopping maintenance server..."
write_status "starting-app" 90 "Starting Next.js application"
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

# ---------------------------------------------------------------------------
# BACKGROUND PHASE - runs entirely after the app is already serving traffic.
# Nothing here can block the deploy or get the maintenance page "stuck":
# the maintenance page is already gone by the time this starts.
#
# - Widget build and Swagger docs write directly into /public, which
#   `next start` serves straight off disk - no restart needed for those.
# - The extension import/safelist generation + `next build` rebuild only
#   apply if extensions are actually installed (via a mounted volume). If
#   that succeeds, it signals the watcher loop below to restart the Next.js
#   process so the rebuilt .next (with extensions) takes effect. The app
#   keeps serving the previous build the entire time this runs, even if it
#   takes the full 30 minutes.
# ---------------------------------------------------------------------------
BACKGROUND_LOG="/tmp/changerawr-background.log"
REBUILD_DONE_FLAG="/tmp/changerawr-rebuild-done"
rm -f "$REBUILD_DONE_FLAG"

(
    {
        echo "🦖 [background] Building widget..."
        if timeout 180 npm run build:widget; then
            echo "✅ [background] Widget build complete"
        else
            echo "⚠️  [background] Widget build failed or timed out - continuing without it"
        fi

        echo "🦖 [background] Generating Swagger documentation..."
        if timeout 180 npm run generate-swagger; then
            echo "✅ [background] Swagger documentation generated"
        else
            echo "⚠️  [background] Swagger generation failed or timed out - continuing without it"
        fi

        if [ -n "$(find extensions -mindepth 2 -maxdepth 2 -type d 2>/dev/null)" ]; then
            echo "🦖 [background] Installed extensions detected - regenerating imports..."
            if timeout 180 npm run extensions:generate; then
                echo "✅ [background] Extension imports regenerated - rebuilding application..."
                if CI_BUILD_MODE=1 DOCKER_BUILD=1 timeout 1800 npm run build; then
                    echo "✅ [background] Rebuild complete - signaling Next.js restart"
                    touch "$REBUILD_DONE_FLAG"
                else
                    echo "⚠️  [background] Rebuild failed or timed out (exit $?) - extensions unavailable until next deploy"
                fi
            else
                echo "⚠️  [background] Extension import/safelist generation failed or timed out - continuing with existing extensionLoader"
            fi
        else
            echo "🦖 [background] No installed extensions, nothing to rebuild"
        fi

        echo "🦖 [background] Background setup complete"
    } 2>&1 | tee "$BACKGROUND_LOG"
) &
BACKGROUND_PID=$!

# Function to handle shutdown gracefully
shutdown() {
    echo "🦖 Shutting down..."

    # Stop the background extension/rebuild job (and anything it spawned)
    if [ -n "$BACKGROUND_PID" ]; then
        echo "🦖 Stopping background setup job (PID: $BACKGROUND_PID)..."
        kill -TERM "$BACKGROUND_PID" 2>/dev/null || true
    fi

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
    rm -f "$STARTUP_LOG" "$STATUS_FILE" "$STATUS_LOG" "$REBUILD_DONE_FLAG"

    echo "🦖 Shutdown complete"
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown SIGTERM SIGINT

# Wait for Next.js, restarting it in place if the background phase produces a
# rebuilt .next with extensions. nginx and the background job are unaffected
# by this restart - only the Next.js process itself briefly cycles.
echo "🦖 All services started. Waiting for Next.js process..."
while true; do
    if [ -f "$REBUILD_DONE_FLAG" ]; then
        rm -f "$REBUILD_DONE_FLAG"
        echo "🦖 New build available - restarting Next.js to load extensions..."
        kill -TERM "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true

        "$@" &
        APP_PID=$!
        echo "🦖 Next.js restarted (PID: $APP_PID)"
    fi

    if ! kill -0 "$APP_PID" 2>/dev/null; then
        break
    fi

    sleep 2
done

wait "$APP_PID" && APP_EXIT=0 || APP_EXIT=$?
echo "🦖 Next.js process exited (code $APP_EXIT)"
shutdown
