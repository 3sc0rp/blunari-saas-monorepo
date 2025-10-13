#!/bin/bash
# Standalone build script for Vercel that bypasses Turbo
# This runs independently of the monorepo structure

set -e  # Exit on error

echo "=========================================="
echo "VERCEL STANDALONE BUILD"
echo "=========================================="
echo "Initial working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""
echo "📋 Directory contents:"
ls -la | head -20
echo ""

# Navigate to client-dashboard
echo "📂 Changing to apps/client-dashboard..."
cd apps/client-dashboard

echo "📂 Now in: $(pwd)"
echo "📋 Contents:"
ls -la | head -15
echo ""

echo "📦 Installing dependencies (including devDependencies)..."
npm ci --include=dev || npm install --include=dev

echo "🔍 Checking installed packages..."
echo "Package.json location: $(pwd)/package.json"
echo "Node modules exists: $([ -d "node_modules" ] && echo "YES" || echo "NO")"

if [ -d "node_modules" ]; then
  echo "Node modules size: $(du -sh node_modules 2>/dev/null || echo 'unknown')"
  echo "Vite package exists: $([ -d "node_modules/vite" ] && echo "YES" || echo "NO")"
  
  if [ -f "node_modules/.bin/vite" ]; then
    echo "✅ Vite binary found: $(node_modules/.bin/vite --version)"
  else
    echo "⚠️  Vite binary not in .bin, checking package..."
    if [ -d "node_modules/vite" ]; then
      echo "✅ Vite package installed, will use npx"
    else
      echo "❌ ERROR: Vite not installed!"
      echo "Checking devDependencies in package.json..."
      node -p "JSON.stringify(require('./package.json').devDependencies.vite)" || echo "Vite not in devDeps"
      exit 1
    fi
  fi
fi

echo "🏗️  Building application with npx..."
NODE_ENV=production npx --yes vite build

echo "✅ Build complete!"
echo "📦 Build output:"
ls -lh dist/ | head -10

echo "=========================================="
echo "BUILD SUCCESSFUL"
echo "=========================================="
