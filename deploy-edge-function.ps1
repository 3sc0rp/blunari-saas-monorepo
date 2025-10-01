# Edge Function Deployment Script
# Handles authentication and deployment for widget-booking-live edge function

Write-Host "🚀 Edge Function Deployment Script" -ForegroundColor Cyan
Write-Host "=" * 60

# Check if we're in the right directory
$targetDir = "C:\Users\Drood\Desktop\Blunari SAAS\apps\client-dashboard"
if ((Get-Location).Path -ne $targetDir) {
    Write-Host "📁 Changing to client-dashboard directory..." -ForegroundColor Yellow
    Set-Location $targetDir
}

# Verify the function exists
$functionPath = "supabase/functions/widget-booking-live/index.ts"
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ Edge function not found at: $functionPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found edge function at: $functionPath" -ForegroundColor Green

# Check Supabase CLI login status
Write-Host "`n🔐 Checking Supabase CLI authentication..." -ForegroundColor Cyan
$loginCheck = npx supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Supabase CLI" -ForegroundColor Yellow
    Write-Host "🔑 Initiating login..." -ForegroundColor Cyan
    npx supabase login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Authenticated with Supabase CLI" -ForegroundColor Green

# Project reference
$projectRef = "wnzxstnxaqukohtzrzrg"
Write-Host "`n📦 Deploying to project: $projectRef" -ForegroundColor Cyan

# Deploy the function
Write-Host "`n🚀 Starting deployment..." -ForegroundColor Cyan
npx supabase functions deploy widget-booking-live --project-ref $projectRef

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "`n📊 Function details:" -ForegroundColor Cyan
    Write-Host "   URL: https://wnzxstnxaqukohtzrzrg.supabase.co/functions/v1/widget-booking-live" -ForegroundColor White
    Write-Host "   Actions: tenant, search, hold, confirm" -ForegroundColor White
    
    Write-Host "`n🧪 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Run tests: node ../test-booking-widget-complete.mjs" -ForegroundColor White
    Write-Host "   2. Check logs: npx supabase functions logs widget-booking-live --project-ref $projectRef" -ForegroundColor White
    
    exit 0
} else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host "`n🔍 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check you have proper permissions for the project" -ForegroundColor White
    Write-Host "   2. Verify project ref is correct: $projectRef" -ForegroundColor White
    Write-Host "   3. Try: npx supabase link --project-ref $projectRef" -ForegroundColor White
    Write-Host "   4. Contact project owner for access" -ForegroundColor White
    
    exit 1
}
