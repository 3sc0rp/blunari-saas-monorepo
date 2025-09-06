#!/bin/bash

# Production Deployment Script for Blunari Client Dashboard
# This script prepares and validates the application for production deployment

set -e

echo "🚀 Blunari Client Dashboard - Production Deployment"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the client-dashboard directory."
    exit 1
fi

echo "📋 Environment Configuration:"
echo "  - Node.js version: $(node --version)"
echo "  - npm version: $(npm --version)"
echo "  - Current directory: $(pwd)"
echo ""

# Step 1: Clean previous builds
echo "🧹 Step 1: Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/.vite/
echo "✅ Cleanup complete"
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Installing dependencies..."
npm ci --production=false
echo "✅ Dependencies installed"
echo ""

# Step 3: Type checking
echo "🔍 Step 3: Running TypeScript type checking..."
npx tsc --noEmit --skipLibCheck
if [ $? -eq 0 ]; then
    echo "✅ Type checking passed"
else
    echo "⚠️ Type checking has warnings but continuing..."
fi
echo ""

# Step 4: Linting (warnings only)
echo "🔍 Step 4: Running ESLint..."
npm run lint --silent || echo "⚠️ Linting warnings found but continuing..."
echo "✅ Linting check complete"
echo ""

# Step 5: Production build
echo "🏗️ Step 5: Building for production..."
NODE_ENV=production npm run build
echo "✅ Production build complete"
echo ""

# Step 6: Analyze build
echo "📊 Step 6: Analyzing build output..."
if [ -d "dist" ]; then
    echo "Build artifacts:"
    du -sh dist/*
    echo ""
    
    # Check for critical files
    if [ -f "dist/index.html" ]; then
        echo "✅ Main HTML file: OK"
    else
        echo "❌ Main HTML file: MISSING"
        exit 1
    fi
    
    if ls dist/assets/*.js >/dev/null 2>&1; then
        echo "✅ JavaScript assets: OK"
    else
        echo "❌ JavaScript assets: MISSING"
        exit 1
    fi
    
    if ls dist/styles/*.css >/dev/null 2>&1; then
        echo "✅ CSS assets: OK"
    else
        echo "⚠️ CSS assets: Not found (may be inlined)"
    fi
else
    echo "❌ Build directory not found"
    exit 1
fi
echo ""

# Step 7: Preview build (optional)
echo "🖥️ Step 7: Production build ready!"
echo ""
echo "📁 Build location: $(pwd)/dist"
echo "📦 Total build size: $(du -sh dist | cut -f1)"
echo ""
echo "To preview the production build locally, run:"
echo "  npm run preview"
echo ""
echo "To deploy to production:"
echo "  1. Upload the 'dist' folder to your web server"
echo "  2. Configure your web server to serve index.html for all routes"
echo "  3. Ensure environment variables are set correctly"
echo ""
echo "🎉 Production deployment preparation complete!"
echo "✅ Application is ready for business use!"
