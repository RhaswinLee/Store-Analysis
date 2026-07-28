#!/usr/bin/env bash
# Start Store-Analysis locally.
# Needs `vercel dev` (not a plain static server) because api/download.js
# is a serverless function that proxies Google Drive downloads for CORS.
set -e
cd "$(dirname "$0")"
PORT="${PORT:-3000}"
echo "Starting store-analysis on http://localhost:$PORT (vercel dev)..."
npx --yes vercel dev --listen "$PORT" --yes
