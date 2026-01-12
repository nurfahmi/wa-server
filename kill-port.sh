#!/bin/bash

# Script to kill process on a specific port
# Usage: ./kill-port.sh [port]

PORT=${1:-3000}

echo "🔍 Checking for processes on port $PORT..."

# Find PIDs using the port
PIDS=$(lsof -ti :$PORT)

if [ -z "$PIDS" ]; then
    echo "✅ No process found running on port $PORT"
    exit 0
fi

echo "⚠️  Found process(es) using port $PORT:"
lsof -i :$PORT

echo ""
echo "🔪 Killing process(es)..."
echo "$PIDS" | xargs kill -9

# Wait a moment for the port to be released
sleep 1

# Verify the port is free
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "❌ Failed to kill process on port $PORT"
    exit 1
else
    echo "✅ Successfully killed process(es) on port $PORT"
    exit 0
fi
