#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js dev server..." >> /tmp/dev-alive.log
  node node_modules/.bin/next dev -p 3000 2>&1 | while IFS= read -r line; do
    echo "[$(date)] $line" >> /tmp/dev-alive.log
  done
  echo "[$(date)] Server exited, restarting in 5s..." >> /tmp/dev-alive.log
  sleep 5
done
