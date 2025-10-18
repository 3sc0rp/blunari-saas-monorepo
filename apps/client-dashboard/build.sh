#!/bin/bash
# Custom build script for Vercel deployment
# Ensures vite is in PATH by using npx

# Run diagnostics first
if [ -f "debug-env.sh" ]; then
  bash debug-env.sh
fi

echo ""
echo "🔧 Starting build process..."
echo "📦 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"
echo "📂 Current directory: $(pwd)"

# Ensure we're in the right directory
cd "$(dirname "$0")"
echo "📂 After cd dirname: $(pwd)"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules not found! This means npm install hasn't run yet."
  echo "📋 Listing current directory:"
  ls -la
  echo ""
  echo "❌ ERROR: Dependencies not installed. Vercel should run 'npm install' before this script."
  exit 1
fi

# Check if vite is installed
if [ -f "node_modules/.bin/vite" ]; then
  echo "✅ Vite found at: node_modules/.bin/vite"
else
  echo "❌ Vite not found in node_modules/.bin/"
  if [ -d "node_modules/.bin/" ]; then
    echo "📋 Listing node_modules/.bin/:"
    ls -la node_modules/.bin/ | head -20
  else
    echo "❌ node_modules/.bin/ directory doesn't exist"
  fi
  echo ""
  echo "📋 Checking if vite package is installed:"
  if [ -d "node_modules/vite" ]; then
    echo "✅ vite package exists in node_modules/vite"
    echo "📋 Contents:"
    ls -la node_modules/vite/bin/
  else
    echo "❌ vite package not found in node_modules/"
  fi
  exit 1
fi

# Run the build using npx to ensure proper PATH
echo "🚀 Running: npx vite build"
npx vite build

echo "✅ Build complete!"
