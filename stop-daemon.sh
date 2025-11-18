#!/bin/bash

# Kuro Daemon Stopper Script
# Usage: ./stop-daemon.sh

echo "🛑 Stopping Kuro daemon..."

PID_FILE="$HOME/.kuro/daemon.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")

    if ps -p $PID > /dev/null 2>&1; then
        echo "   Found daemon with PID: $PID"
        kill $PID

        sleep 2

        if ps -p $PID > /dev/null 2>&1; then
            echo "   Forcing shutdown..."
            kill -9 $PID
        fi

        rm -f "$PID_FILE"
        echo "✅ Daemon stopped"
    else
        echo "⚠️  PID file exists but process not running"
        rm -f "$PID_FILE"
    fi
else
    if pgrep -f "kuro --daemon" > /dev/null 2>&1; then
        echo "   Found kuro daemon process"
        pkill -f "kuro --daemon"
        echo "✅ Daemon stopped"
    elif pgrep -f "bun.*--daemon" > /dev/null 2>&1; then
        echo "   Found bun daemon process"
        pkill -f "bun.*--daemon"
        echo "✅ Daemon stopped"
    else
        echo "ℹ️  No daemon running"
    fi
fi
