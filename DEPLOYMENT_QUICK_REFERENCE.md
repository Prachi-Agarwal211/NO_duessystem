# 🚀 Quick Deployment Reference - Windows PowerShell

## One-Command Deployment

```powershell
# Run the automated deployment script
.\DEPLOYMENT_COMMANDS_POWERSHELL.ps1
```

---

## Manual Step-by-Step Commands

### Step 1: Database Migration (REQUIRED - Manual)

```powershell
# ⚠️ MANUAL STEP - Cannot be automated
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of: database\PERFORMANCE_AND_STATS_OPTIMIZATION.sql
# 3. Paste and Run
# 4. Verify: ✓ 6 indexes created, ✓ 2 functions updated
```

### Step 2: Backup Current Files

```powershell
Copy-Item -Path "src\app\staff\dashboard\page.js" -Destination "src\app\staff\dashboard\page.backup.js"
Copy-Item -Path "src\app\admin\page.js" -Destination "src\app\admin\page.backup.js"
Copy-Item -Path "src\app\api\staff\dashboard\route.js" -Destination "src\app\api\staff\dashboard\route.backup.js"

Write-Host "✅ Backups created" -ForegroundColor Green
```

### Step 3: Activate New System

```powershell
Move-Item -Path "src\app\staff\dashboard\page-simplified.js" -Destination "src\app\staff\dashboard\page.js" -Force
Move-Item -Path "src\app\admin\page-simplified.js" -Destination "src\app\admin\page.js" -Force
Move-Item -Path "src\app\api\staff\dashboard\route-optimized.js" -Destination "src\app\api\staff\dashboard\route.js" -Force

Write-Host "✅ New system activated" -ForegroundColor Green
```

### Step 4: Delete Duplicate Components

```powershell
Remove-Item -Path "src\components\staff\StatsCard.jsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\components\admin\StatsCard.jsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src\components\shared\StatsCard.jsx" -Force -ErrorAction SilentlyContinue

Write-Host "✅ Duplicates removed" -ForegroundColor Green
```

### Step 5: Git Deployment

```powershell
git add .
git commit -m "feat: unified dashboard system - fix 0 stats + optimize performance"
git push origin main

Write-Host "✅ Deployed to production" -ForegroundColor Green
```

---

## Verification Commands

### Check File Status
```powershell
# Verify new files exist
Test-Path "src\components\dashboard\StatsGrid.jsx"
Test-Path "src\app\staff\dashboard\page.js"
Test-Path "src\app\admin\page.js"

# Verify backups created
Test-Path "src\app\staff\dashboard\page.backup.js"
Test-Path "src\app\admin\page.backup.js"

# Verify duplicates deleted
!(Test-Path "src\components\staff\StatsCard.jsx")
!(Test-Path "src\components\admin\StatsCard.jsx")
```

### Check Git Status
```powershell
git status
git log -1 --oneline
```

---

## Rollback Commands (If Needed)

### Quick Rollback
```powershell
Move-Item -Path "src\app\staff\dashboard\page.backup.js" -Destination "src\app\staff\dashboard\page.js" -Force
Move-Item -Path "src\app\admin\page.backup.js" -Destination "src\app\admin\page.js" -Force
Move-Item -Path "src\app\api\staff\dashboard\route.backup.js" -Destination "src\app\api\staff\dashboard\route.js" -Force

git add .
git commit -m "rollback: revert unified dashboard changes"
git push origin main

Write-Host "✅ Rollback complete" -ForegroundColor Yellow
```

---

## Troubleshooting

### Error: "Cannot find simplified files"
```powershell
# Check if files exist
Get-ChildItem -Path "src\app\staff\dashboard\" -Filter "*simplified*"
Get-ChildItem -Path "src\app\admin\" -Filter "*simplified*"
Get-ChildItem -Path "src\app\api\staff\dashboard\" -Filter "*optimized*"
```

### Error: "Access Denied"
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → "Run as Administrator"
```

### Error: "Execution Policy"
```powershell
# Allow script execution (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run deployment script
.\DEPLOYMENT_COMMANDS_POWERSHELL.ps1
```

---

## Expected Output

### Successful Deployment Output
```
🚀 Starting Unified Dashboard System Deployment...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Database Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Database migration confirmed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: Backing Up Current Files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Created backup: src\app\staff\dashboard\page.backup.js
✅ Created backup: src\app\admin\page.backup.js
✅ Created backup: src\app\api\staff\dashboard\route.backup.js

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: Activating Unified System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Activated: Staff Dashboard (page-simplified.js → page.js)
✅ Activated: Admin Dashboard (page-simplified.js → page.js)
✅ Activated: Staff API (route-optimized.js → route.js)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: Removing Duplicate Components
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Deleted: src\components\staff\StatsCard.jsx
✅ Deleted: src\components\admin\StatsCard.jsx
✅ Deleted: src\components\shared\StatsCard.jsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: Git Deployment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Pushed to origin main - Vercel will auto-deploy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 DEPLOYMENT COMPLETE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Unified Dashboard System is now live!
```

---

## Time Estimates

| Task | Duration |
|------|----------|
| Database Migration | 2 minutes |
| File Operations | 1 minute |
| Git Push | 1 minute |
| Vercel Deploy | 2-3 minutes |
| **Total** | **6-7 minutes** |

---

## Files Modified

### Created
- ✅ `src/components/dashboard/StatsGrid.jsx`
- ✅ `src/app/staff/dashboard/page.js` (replaced)
- ✅ `src/app/admin/page.js` (replaced)
- ✅ `src/app/api/staff/dashboard/route.js` (replaced)

### Deleted
- ❌ `src/components/staff/StatsCard.jsx`
- ❌ `src/components/admin/StatsCard.jsx`
- ❌ `src/components/shared/StatsCard.jsx`

### Backed Up
- 💾 `src/app/staff/dashboard/page.backup.js`
- 💾 `src/app/admin/page.backup.js`
- 💾 `src/app/api/staff/dashboard/route.backup.js`

---

## Post-Deployment Testing

```powershell
# Open in browser (after Vercel deploy completes)
Start-Process "https://your-domain.vercel.app/staff/dashboard"
Start-Process "https://your-domain.vercel.app/admin"
```

**Test Checklist:**
- [ ] Staff Dashboard shows accurate stats (not 0)
- [ ] Admin Dashboard shows system totals
- [ ] No "Invalid Date" errors in console
- [ ] Quick Approve button works instantly
- [ ] Realtime updates within 1-2 seconds
- [ ] Load time < 1 second

---

**Last Updated:** 2025-12-18  
**Script Version:** 1.0.0  
**Platform:** Windows PowerShell 5.1+