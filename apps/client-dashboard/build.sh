#!/bin/bash
# Custom build script for Vercel deployment
# Ensures vite is in PATH by using npx

echo "🔧 Starting build process..."
echo "📦 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules not found! Installing dependencies..."
  npm install
fi

# Check if vite is installed
if [ -f "node_modules/.bin/vite" ]; then
  echo "✅ Vite found at: node_modules/.bin/vite"
else
  echo "❌ Vite not found in node_modules/.bin/"
  echo "📋 Listing node_modules/.bin/:"
  ls -la node_modules/.bin/ | head -20
  exit 1
fi

# Run the build using npx to ensure proper PATH
echo "🚀 Running: npx vite build"
npx vite build

echo "✅ Build complete!"
