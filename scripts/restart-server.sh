#!/usr/bin/env bash
# Restarts the local production server on PORT (default 3200). Run `npm run build` first.
PORT="${PORT:-3200}"
cd "$(dirname "$0")/.."
PID=$(ss -ltnp 2>/dev/null | grep ":$PORT " | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)
[ -n "$PID" ] && kill "$PID" && sleep 1
nohup npx next start -p "$PORT" > /tmp/psk-server.log 2>&1 &
for i in $(seq 1 40); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 0.5; done
echo "server on http://localhost:$PORT (log: /tmp/psk-server.log)"
