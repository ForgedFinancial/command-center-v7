#!/bin/bash
set -e
echo "=== CC v7 Build Validation ==="
echo "→ Building..."
npx vite build > /dev/null 2>&1 || { echo "❌ Build failed"; exit 1; }
echo "✓ Build passes"
echo "→ Running tests..."
npx vitest run || { echo "❌ Tests failed"; exit 1; }
echo "✓ Tests pass"
echo "=== ✅ Validation Complete ==="
