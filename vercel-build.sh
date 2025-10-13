#!/bin/bash
# Standalone build script for Vercel that bypasses Turbo
# This runs independently of the monorepo structure

set -e  # Exit on error

echo "=========================================="
echo "VERCEL STANDALONE BUILD"
echo "=========================================="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""

# Navigate to client-dashboard
echo "📂 Changing to apps/client-dashboard..."
cd apps/client-dashboard

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔍 Verifying vite installation..."
if [ -f "node_modules/.bin/vite" ]; then
  echo "✅ Vite found: $(node_modules/.bin/vite --version)"
else
  echo "❌ ERROR: Vite not found after npm install!"
  exit 1
fi

echo "🏗️  Building application..."
NODE_ENV=production npx vite build

echo "✅ Build complete!"
echo "📦 Build output:"
ls -lh dist/ | head -10

echo "=========================================="
echo "BUILD SUCCESSFUL"
echo "=========================================="
