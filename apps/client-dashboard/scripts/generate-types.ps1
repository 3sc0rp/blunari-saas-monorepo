# Script to regenerate Supabase types after database migrations
# Run this script after applying catering migrations or any database changes

Write-Host "🔄 Generating Supabase TypeScript types..." -ForegroundColor Blue

# Navigate to client dashboard directory
Set-Location "c:\Users\Drood\Desktop\Blunari SAAS\apps\client-dashboard"

# Generate types from Supabase
try {
    npx supabase gen types typescript --project-id $env:SUPABASE_PROJECT_ID --schema public > src/integrations/supabase/types.ts
    Write-Host "✅ Types generated successfully!" -ForegroundColor Green
    
    # Remove the catering hook type assertions after types are generated
    Write-Host "📝 Note: You can now remove the 'as any' type assertions from useCateringData.ts" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error generating types: $_" -ForegroundColor Red
    Write-Host "Make sure you have:" -ForegroundColor Yellow
    Write-Host "1. SUPABASE_PROJECT_ID environment variable set" -ForegroundColor Yellow
    Write-Host "2. Supabase CLI installed and logged in" -ForegroundColor Yellow
    Write-Host "3. Database migrations applied" -ForegroundColor Yellow
}

Write-Host "🏁 Type generation complete!" -ForegroundColor Green
