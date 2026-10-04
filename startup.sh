#!/bin/sh
# Restart contract: preview must answer on 0.0.0.0:8080
set -eu
cd /workspace
if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >/tmp/heartlink-dev.log 2>&1 &
for i in $(seq 1 40); do
  curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/ && exit 0
  sleep 0.4
done
exit 0
