#!/bin/bash

# Kuro Daemon Status Checker
# Usage: ./status-daemon.sh

echo "📊 Kuro Daemon Status"
echo "===================="
echo ""

PID_FILE="$HOME/.kuro/daemon.pid"
IS_RUNNING=false

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        IS_RUNNING=true
        echo "✅ Status: RUNNING"
        echo "   PID: $PID"

        RUNTIME=$(ps -o etime= -p $PID | tr -d ' ')
        MEM=$(ps -o rss= -p $PID | awk '{print int($1/1024)" MB"}')

        echo "   Uptime: $RUNTIME"
        echo "   Memory: $MEM"
    fi
fi

if [ "$IS_RUNNING" = false ]; then
    if pgrep -f "kuro --daemon" > /dev/null 2>&1 || pgrep -f "bun.*--daemon" > /dev/null 2>&1; then
        echo "⚠️  Status: RUNNING (no PID file)"
        echo "   Process found but PID file missing"
    else
        echo "❌ Status: STOPPED"
    fi
fi

echo ""

DB_FILE="$HOME/.kuro/kuro.db"
if [ -f "$DB_FILE" ]; then
    echo "📁 Database: $DB_FILE"

    if command -v sqlite3 > /dev/null 2>&1; then
        TASK_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM tasks" 2>/dev/null || echo "?")
        RUNNING_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM tasks WHERE status='running'" 2>/dev/null || echo "?")
        LOG_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM logs" 2>/dev/null || echo "?")

        echo "   Tasks: $TASK_COUNT total, $RUNNING_COUNT running"
        echo "   Logs: $LOG_COUNT entries"
    fi
fi

echo ""

LOG_FILE="$HOME/.kuro/logs/daemon.log"
if [ -f "$LOG_FILE" ]; then
    echo "📝 Last 5 log lines:"
    tail -n 5 "$LOG_FILE" | sed 's/^/   /'
    echo ""
    echo "   Full logs: tail -f $LOG_FILE"
fi

echo ""

if [ "$IS_RUNNING" = true ]; then
    echo "🛑 Stop daemon: ./stop-daemon.sh"
else
    echo "🚀 Start daemon: ./start-daemon.sh"
fi
