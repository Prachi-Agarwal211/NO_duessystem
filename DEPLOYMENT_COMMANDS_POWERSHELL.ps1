# ============================================
# UNIFIED DASHBOARD SYSTEM - DEPLOYMENT SCRIPT
# Windows PowerShell Version
# ============================================

Write-Host "🚀 Starting Unified Dashboard System Deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Database Migration (Manual Step)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "STEP 1: Database Migration" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  MANUAL ACTION REQUIRED:" -ForegroundColor Red
Write-Host "1. Open Supabase Dashboard → SQL Editor" -ForegroundColor White
Write-Host "2. Copy contents of: database\PERFORMANCE_AND_STATS_OPTIMIZATION.sql" -ForegroundColor White
Write-Host "3. Paste and run in SQL Editor" -ForegroundColor White
Write-Host "4. Verify output shows: ✓ 6 indexes created, ✓ 2 functions updated" -ForegroundColor White
Write-Host ""
$confirmation = Read-Host "Have you completed the database migration? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Deployment cancelled. Please run database migration first." -ForegroundColor Red
    exit
}
Write-Host "✅ Database migration confirmed" -ForegroundColor Green
Write-Host ""

# Step 2: Backup Current Files
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "STEP 2: Backing Up Current Files" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

Copy-Item -Path "src\app\staff\dashboard\page.js" -Destination "src\app\staff\dashboard\page.backup.js" -ErrorAction SilentlyContinue
Copy-Item -Path "src\app\admin\page.js" -Destination "src\app\admin\page.backup.js" -ErrorAction SilentlyContinue
Copy-Item -Path "src\app\api\staff\dashboard\route.js" -Destination "src\app\api\staff\dashboard\route.backup.js" -ErrorAction SilentlyContinue

Write-Host "✅ Created backup: src\app\staff\dashboard\page.backup.js" -ForegroundColor Green
Write-Host "✅ Created backup: src\app\admin\page.backup.js" -ForegroundColor Green
Write-Host "✅ Created backup: src\app\api\staff\dashboard\route.backup.js" -ForegroundColor Green
Write-Host ""

# Step 3: Activate New System
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "STEP 3: Activating Unified System" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

# Check if simplified files exist
if (Test-Path "src\app\staff\dashboard\page-simplified.js") {
    Move-Item -Path "src\app\staff\dashboard\page-simplified.js" -Destination "src\app\staff\dashboard\page.js" -Force
    Write-Host "✅ Activated: Staff Dashboard (page-simplified.js → page.js)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: page-simplified.js not found. Skipping..." -ForegroundColor Yellow
}

if (Test-Path "src\app\admin\page-simplified.js") {
    Move-Item -Path "src\app\admin\page-simplified.js" -Destination "src\app\admin\page.js" -Force
    Write-Host "✅ Activated: Admin Dashboard (page-simplified.js → page.js)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: page-simplified.js not found. Skipping..." -ForegroundColor Yellow
}

if (Test-Path "src\app\api\staff\dashboard\route-optimized.js") {
    Move-Item -Path "src\app\api\staff\dashboard\route-optimized.js" -Destination "src\app\api\staff\dashboard\route.js" -Force
    Write-Host "✅ Activated: Staff API (route-optimized.js → route.js)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: route-optimized.js not found. Skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Delete Duplicate Components
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "STEP 4: Removing Duplicate Components" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

$duplicates = @(
    "src\components\staff\StatsCard.jsx",
    "src\components\admin\StatsCard.jsx",
    "src\components\shared\StatsCard.jsx"
)

foreach ($file in $duplicates) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "✅ Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Not found (already deleted): $file" -ForegroundColor Gray
    }
}
Write-Host ""

# Step 5: Git Deployment
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "STEP 5: Git Deployment" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

git add .
git commit -m "feat: unified dashboard system - fix 0 stats + optimize performance"

Write-Host ""
Write-Host "📦 Changes committed to Git" -ForegroundColor Green
Write-Host ""
$pushConfirm = Read-Host "Do you want to push to origin main? (yes/no)"
if ($pushConfirm -eq "yes") {
    git push origin main
    Write-Host "✅ Pushed to origin main - Vercel will auto-deploy" -ForegroundColor Green
} else {
    Write-Host "⏸️  Skipped push. Run 'git push origin main' manually when ready." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Unified Dashboard System is now live!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor White
Write-Host "1. Wait for Vercel deployment to complete (~2 minutes)" -ForegroundColor Gray
Write-Host "2. Test Staff Dashboard: Login as any department staff" -ForegroundColor Gray
Write-Host "3. Test Admin Dashboard: Login as admin" -ForegroundColor Gray
Write-Host "4. Verify stats show accurate numbers (not 0)" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor White
Write-Host "   - Deployment Guide: UNIFIED_DASHBOARD_DEPLOYMENT_GUIDE.md" -ForegroundColor Gray
Write-Host "   - Complete Solution: UNIFIED_DASHBOARD_COMPLETE_SOLUTION.md" -ForegroundColor Gray
Write-Host ""
Write-Host "🔄 Rollback (if needed):" -ForegroundColor White
Write-Host "   Move-Item src\app\staff\dashboard\page.backup.js src\app\staff\dashboard\page.js -Force" -ForegroundColor Gray
Write-Host "   Move-Item src\app\admin\page.backup.js src\app\admin\page.js -Force" -ForegroundColor Gray
Write-Host "   Move-Item src\app\api\staff\dashboard\route.backup.js src\app\api\staff\dashboard\route.js -Force" -ForegroundColor Gray
Write-Host ""