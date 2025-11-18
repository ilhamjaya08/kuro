#!/bin/bash

# Kuro Daemon Starter Script
# Usage: ./start-daemon.sh

set -e

echo "🚀 Starting Kuro daemon..."

if pgrep -f "kuro --daemon" > /dev/null 2>&1 || pgrep -f "bun.*--daemon" > /dev/null 2>&1; then
    echo "⚠️  Kuro daemon is already running!"
    echo "   To stop: ./stop-daemon.sh"
    exit 1
fi

if command -v kuro > /dev/null 2>&1; then
    CMD="kuro --daemon"
elif [ -f "$HOME/.bun/bin/bun" ]; then
    CMD="$HOME/.bun/bin/bun run src/index.ts --daemon"
elif command -v bun > /dev/null 2>&1; then
    CMD="bun run src/index.ts --daemon"
else
    echo "❌ Error: Neither 'kuro' nor 'bun' found"
    echo "   Install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

LOG_DIR="$HOME/.kuro/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/daemon.log"

echo "   Command: $CMD"
echo "   Log file: $LOG_FILE"

nohup $CMD > "$LOG_FILE" 2>&1 &
PID=$!

echo $PID > "$HOME/.kuro/daemon.pid"

sleep 2

if ps -p $PID > /dev/null 2>&1; then
    echo "✅ Daemon started successfully!"
    echo "   PID: $PID"
    echo ""
    echo "📊 Monitor:"
    echo "   tail -f $LOG_FILE"
    echo ""
    echo "🛑 Stop:"
    echo "   ./stop-daemon.sh"
else
    echo "❌ Failed to start daemon. Check logs:"
    echo "   tail -n 50 $LOG_FILE"
    exit 1
fi
