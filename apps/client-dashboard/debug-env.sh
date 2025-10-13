#!/bin/bash
# Debug script to understand Vercel's environment
echo "========================================"
echo "VERCEL ENVIRONMENT DIAGNOSTICS"
echo "========================================"
echo "📂 PWD: $(pwd)"
echo "📂 VERCEL_ROOT: ${VERCEL_ROOT:-not set}"
echo "📂 VERCEL_PROJECT_ROOT: ${VERCEL_PROJECT_ROOT:-not set}"
echo "📦 Node: $(node --version)"
echo "📦 NPM: $(npm --version)"
echo ""
echo "📋 Directory structure:"
ls -la
echo ""
echo "📋 Is this apps/client-dashboard?"
if [ -f "package.json" ]; then
  echo "✅ package.json exists"
  echo "Package name: $(node -p "require('./package.json').name")"
else
  echo "❌ No package.json found!"
fi
echo ""
echo "📋 Does node_modules exist?"
if [ -d "node_modules" ]; then
  echo "✅ node_modules exists"
  echo "Size: $(du -sh node_modules 2>/dev/null || echo 'unknown')"
  if [ -d "node_modules/.bin" ]; then
    echo "✅ node_modules/.bin exists"
    echo "Number of executables: $(ls node_modules/.bin 2>/dev/null | wc -l)"
    if [ -f "node_modules/.bin/vite" ]; then
      echo "✅ vite binary found!"
    else
      echo "❌ vite binary NOT found"
      echo "Available in .bin:"
      ls node_modules/.bin | head -10
    fi
  else
    echo "❌ node_modules/.bin doesn't exist"
  fi
else
  echo "❌ node_modules doesn't exist!"
  echo "⚠️  npm install has NOT run or ran in wrong directory"
fi
echo "========================================"
