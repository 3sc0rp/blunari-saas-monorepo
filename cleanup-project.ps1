# Project Cleanup Script
# Removes temporary, debug, and redundant files from the project

Write-Host "Starting Project Cleanup..." -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$filesToDelete = @()

# Category 1: Debug and Diagnostic Files in Root
Write-Host "Category 1: Debug/Diagnostic Files" -ForegroundColor Yellow
$debugFiles = @(
    "diagnose-email-update-error.sql",
    "QUICK_DIAGNOSTIC.sql",
    "verify-migration.sql",
    "test-credentials-update.mjs",
    "test-auth-email-update.mjs"
)

foreach ($file in $debugFiles) {
    $fullPath = Join-Path $rootPath $file
    if (Test-Path $fullPath) {
        $filesToDelete += $fullPath
        Write-Host "  - $file" -ForegroundColor Gray
    }
}

# Category 2: Redundant/Old Troubleshooting Documentation
Write-Host ""
Write-Host "Category 2: Old Troubleshooting Docs" -ForegroundColor Yellow
$oldDocs = @(
    "500_ERROR_BACK_TROUBLESHOOT.md",
    "BUGS_FIXED_AND_IMPROVEMENTS_APPLIED.md",
    "CLEANUP_SUMMARY.md",
    "COMPREHENSIVE_BUG_FIXES_AND_IMPROVEMENTS.md",
    "CREDENTIAL_FIX_COMPLETE.md",
    "CREDENTIAL_MANAGEMENT_FIX_SUMMARY.md",
    "DEFINITIVE_500_ERROR_FIX.md",
    "LOCKS_API_FIX_COMPLETE.md",
    "MANAGE_CREDENTIALS_500_ERROR_FIX.md",
    "OWNER_EMAIL_CONSISTENCY_FIX.md",
    "PASSWORD_RESET_FIX.md",
    "REACT_ERROR_321_BROWSER_CACHE.md",
    "REACT_ERROR_321_FIX.md",
    "SERVICE_WORKER_FIX.md",
    "STRIPE_CORS_FIX.md",
    "TENANT_CREDENTIALS_FIX.md",
    "WIDGET_URL_FIX.md",
    "TENANT_RESET_FILES_SUMMARY.md",
    "TENANT_SYSTEM_RESET_AND_AUDIT.md",
    "EXECUTE_TENANT_RESET.md",
    "MIGRATION_COMPLETED_SUCCESS.md",
    "ACCESSIBILITY_AUDIT_REPORT.md"
)

foreach ($file in $oldDocs) {
    $fullPath = Join-Path $rootPath $file
    if (Test-Path $fullPath) {
        $filesToDelete += $fullPath
        Write-Host "  - $file" -ForegroundColor Gray
    }
}

# Category 3: Debug Scripts
Write-Host ""
Write-Host "Category 3: Debug/Test Scripts" -ForegroundColor Yellow
$debugScripts = @(
    "scripts\check-bookings-schema.mjs",
    "scripts\check-database-bookings.mjs",
    "scripts\check-database-tables.mjs",
    "scripts\check-recent-bookings.mjs",
    "scripts\check-user-tenant.mjs",
    "scripts\debug-booking-flow.mjs",
    "scripts\debug-persistence-error.mjs",
    "scripts\debug-reservations.mjs",
    "scripts\debug-smart-booking.mjs",
    "scripts\debug-token-creation.mjs",
    "scripts\debug-widget-api-flow.mjs",
    "scripts\decode-jwt-token.mjs",
    "scripts\diagnose-widget-analytics.mjs",
    "scripts\inspect-bookings-schema.mjs",
    "scripts\live-admin-login-check.mjs",
    "scripts\test-production-booking-flow.mjs",
    "scripts\test-production-comprehensive.mjs",
    "scripts\test-fixed-verification.mjs",
    "scripts\test-dashboard-visibility.mjs",
    "scripts\test-dashboard-query.mjs",
    "scripts\test-production-widget.mjs",
    "scripts\test-staff-invite.mjs",
    "scripts\test-production-final.mjs",
    "scripts\test-dashboard-bookings.mjs",
    "scripts\test-correct-format.mjs",
    "scripts\test-token-exact-match.mjs",
    "scripts\test-timeslot-format.mjs",
    "scripts\test-widget-token.mjs",
    "scripts\widget-test-server.mjs",
    "scripts\fix-booking-rls.sql",
    "scripts\fix-rls-policies.sql",
    "scripts\fix-booking-status.mjs",
    "scripts\fix-rls.mjs",
    "scripts\widget_public_policies.sql"
)

foreach ($file in $debugScripts) {
    $fullPath = Join-Path $rootPath $file
    if (Test-Path $fullPath) {
        $filesToDelete += $fullPath
        Write-Host "  - $file" -ForegroundColor Gray
    }
}

# Category 4: Redundant Documentation
Write-Host ""
Write-Host "Category 4: Redundant Documentation" -ForegroundColor Yellow
$redundantDocs = @(
    "CONTINUATION_PROMPT.md",
    "CONTINUATION_PROMPT_SHORT.md",
    "ADMIN_DASHBOARD_COMPREHENSIVE_ANALYSIS.md",
    "ADMIN_DASHBOARD_IMPLEMENTATION_SUMMARY.md"
)

foreach ($file in $redundantDocs) {
    $fullPath = Join-Path $rootPath $file
    if (Test-Path $fullPath) {
        $filesToDelete += $fullPath
        Write-Host "  - $file" -ForegroundColor Gray
    }
}

# Summary
Write-Host ""
Write-Host "Cleanup Summary:" -ForegroundColor Cyan
Write-Host "  Files to delete: $($filesToDelete.Count)" -ForegroundColor White
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed with deletion? (yes/no)"

if ($confirmation -eq "yes") {
    Write-Host ""
    Write-Host "Deleting files..." -ForegroundColor Red
    
    $deletedCount = 0
    $errorCount = 0
    
    foreach ($file in $filesToDelete) {
        try {
            if (Test-Path $file) {
                Remove-Item $file -Force
                $deletedCount++
                $fileName = Split-Path $file -Leaf
                Write-Host "  [OK] Deleted: $fileName" -ForegroundColor Green
            }
        }
        catch {
            $errorCount++
            $fileName = Split-Path $file -Leaf
            Write-Host "  [ERROR] Failed to delete: $fileName" -ForegroundColor Red
            Write-Host "    $($_.Exception.Message)" -ForegroundColor DarkRed
        }
    }
    
    Write-Host ""
    Write-Host "Cleanup Complete!" -ForegroundColor Green
    Write-Host "  Successfully deleted: $deletedCount files" -ForegroundColor White
    if ($errorCount -gt 0) {
        Write-Host "  Errors: $errorCount files" -ForegroundColor Red
    }
    
    # Create cleanup report
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $dateStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $reportPath = Join-Path $rootPath "CLEANUP_REPORT_$timestamp.md"
    
    $report = "# Project Cleanup Report`n"
    $report += "**Date**: $dateStr`n`n"
    $report += "## Summary`n"
    $report += "- **Total Files Deleted**: $deletedCount`n"
    $report += "- **Errors**: $errorCount`n`n"
    $report += "## Categories Cleaned`n`n"
    $report += "### 1. Debug and Diagnostic Files`n"
    $report += "- Temporary SQL diagnostic files`n"
    $report += "- Test authentication scripts`n`n"
    $report += "### 2. Old Troubleshooting Documentation`n"
    $report += "- Consolidated bug fix documentation`n"
    $report += "- Historical error fix records`n`n"
    $report += "### 3. Debug/Test Scripts`n"
    $report += "- Development debugging utilities`n"
    $report += "- One-off test scripts`n`n"
    $report += "### 4. Redundant Documentation`n"
    $report += "- Duplicate analysis documents`n"
    $report += "- Old continuation prompts`n"
    
    Set-Content -Path $reportPath -Value $report
    
    Write-Host ""
    $reportName = Split-Path $reportPath -Leaf
    Write-Host "Cleanup report saved: $reportName" -ForegroundColor Cyan
    
} else {
    Write-Host ""
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    Write-Host "No files were deleted." -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
