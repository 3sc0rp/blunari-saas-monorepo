#!/bin/bash
# Standalone build script for Vercel that bypasses Turbo
# This runs independently of the monorepo structure

set -e  # Exit on error
set -x  # Print commands for debugging

echo "=========================================="
echo "VERCEL STANDALONE BUILD"
echo "=========================================="
echo "Initial working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""

# Navigate to client-dashboard
echo "📂 Changing to apps/client-dashboard..."
cd apps/client-dashboard || {
  echo "❌ ERROR: Cannot cd to apps/client-dashboard"
  echo "Current directory: $(pwd)"
  ls -la
  exit 1
}

echo "📂 Now in: $(pwd)"
echo ""

# Clean any previous installs
echo "🧹 Cleaning previous node_modules..."
rm -rf node_modules package-lock.json

echo "� Installing dependencies with --legacy-peer-deps..."
npm install --legacy-peer-deps --loglevel=verbose

# Verify installation
echo ""
echo "🔍 Verifying installation..."
if [ ! -d "node_modules" ]; then
  echo "❌ ERROR: node_modules not created!"
  exit 1
fi

echo "✅ node_modules exists"

# Check for vite in multiple locations
VITE_FOUND=false

if [ -f "node_modules/.bin/vite" ]; then
  echo "✅ Vite binary found at: node_modules/.bin/vite"
  VITE_CMD="./node_modules/.bin/vite"
  VITE_FOUND=true
elif [ -d "node_modules/vite" ]; then
  echo "⚠️ Vite package found but no binary in .bin"
  echo "Will use: node node_modules/vite/bin/vite.js"
  VITE_CMD="node node_modules/vite/bin/vite.js"
  VITE_FOUND=true
fi

if [ "$VITE_FOUND" = false ]; then
  echo "❌ ERROR: Vite not found!"
  echo "Checking package.json devDependencies..."
  cat package.json | grep -A5 "devDependencies"
  echo ""
  echo "Checking node_modules contents..."
  ls -la node_modules | head -20
  exit 1
fi

echo "🏗️  Building application..."
echo "Using command: $VITE_CMD build"
NODE_ENV=production $VITE_CMD build

echo ""
echo "✅ Build complete!"
echo "📦 Build output:"
ls -lh dist/ | head -10

echo "=========================================="
echo "BUILD SUCCESSFUL"
echo "=========================================="
