# ====================================================================
# QUICK START: Verify Admin/Tenant Separation UI Update
# ====================================================================
# Run this script to restart the admin dashboard and verify changes
# ====================================================================

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Admin/Tenant Separation - UI Verification Quick Start      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$projectRoot = "c:\Users\Drood\Desktop\Blunari SAAS"

Write-Host "📍 Project Location: $projectRoot`n" -ForegroundColor Yellow

# Step 1: Navigate to project
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "STEP 1: Navigating to project directory..." -ForegroundColor Green
Set-Location $projectRoot
Write-Host "✅ Current directory: $(Get-Location)`n" -ForegroundColor Green

# Step 2: Check if admin-dashboard exists
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "STEP 2: Checking project structure..." -ForegroundColor Green

if (Test-Path "apps\admin-dashboard") {
    Write-Host "✅ Admin dashboard found`n" -ForegroundColor Green
} else {
    Write-Host "❌ Admin dashboard not found!" -ForegroundColor Red
    Write-Host "   Please ensure you're in the correct directory.`n" -ForegroundColor Red
    exit 1
}

# Step 3: Show what will happen
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "STEP 3: What will happen next..." -ForegroundColor Green
Write-Host ""
Write-Host "  1️⃣  Start admin dashboard dev server" -ForegroundColor White
Write-Host "  2️⃣  Open browser to http://localhost:5173" -ForegroundColor White
Write-Host "  3️⃣  You'll need to clear cache (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "  4️⃣  Login and check tenant credentials" -ForegroundColor White
Write-Host ""

# Step 4: Confirmation
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "STEP 4: Ready to start dev server?" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: After the server starts:" -ForegroundColor Yellow
Write-Host "   1. Open http://localhost:5173 in browser" -ForegroundColor Yellow
Write-Host "   2. Press Ctrl+Shift+R to clear cache" -ForegroundColor Yellow
Write-Host "   3. Login as: drood.tech@gmail.com" -ForegroundColor Yellow
Write-Host "   4. Go to: Tenants → droodwick → Configuration" -ForegroundColor Yellow
Write-Host "   5. Check: Login Credentials should show 'deewav3@gmail.com'" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Start admin dashboard now? (Y/N)"

if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host "`n❌ Cancelled. You can run 'npm run dev:admin' manually when ready.`n" -ForegroundColor Yellow
    exit 0
}

# Step 5: Start dev server
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "STEP 5: Starting admin dashboard dev server...`n" -ForegroundColor Green

Write-Host "🚀 Running: npm run dev:admin`n" -ForegroundColor Cyan

# Run the dev server
npm run dev:admin

# Note: The script will stay running while the dev server is active
# User can stop it with Ctrl+C
