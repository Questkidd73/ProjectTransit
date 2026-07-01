#!/bin/bash
# Starts the Project Transit local dev server.
# Usage: ./start-local.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/app" || exit 1
npm run dev
