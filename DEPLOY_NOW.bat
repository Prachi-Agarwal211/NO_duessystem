@echo off
REM 🚀 JECRC No Dues System - Quick Deploy Script (Windows)
REM This script deploys all code fixes to production

echo ======================================
echo 🚀 JECRC No Dues System Deployment
echo ======================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo ❌ Error: Not a git repository
    echo Please initialize git first: git init
    pause
    exit /b 1
)

REM Check for uncommitted changes
echo 📋 Checking for changes...
git diff-index --quiet HEAD -- 2>nul
if errorlevel 1 (
    echo ✅ Found changes to commit
) else (
    echo ⚠️  No changes detected
    echo Files may already be committed
)

echo.
echo 📁 Files to be deployed:
echo   - src/components/student/SubmitForm.jsx (session year fix)
echo   - src/app/api/student/route.js (validation fix)
echo.

REM Confirm deployment
set /p CONFIRM="🚀 Ready to deploy? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo ❌ Deployment cancelled
    pause
    exit /b 1
)

echo.
echo 📦 Staging files...
git add src/components/student/SubmitForm.jsx
git add src/app/api/student/route.js

echo 💬 Creating commit...
git commit -m "Fix: Email validation and session year handling - College email domain: jecrc.ac.in to jecrcu.edu.in - Session year validation: Handle empty strings as null - Improved error messages and validation logic"

if errorlevel 1 (
    echo ⚠️  Commit failed or no changes to commit
    echo Files may already be committed
    echo.
    echo Checking current status...
    git status
    echo.
    set /p PUSHANYWAY="Push anyway? (y/n): "
    if /i not "%PUSHANYWAY%"=="y" (
        echo ❌ Deployment cancelled
        pause
        exit /b 1
    )
)

echo.
echo 🌐 Pushing to remote...
echo Detecting branch...

REM Get current branch name
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%i
echo Current branch: %BRANCH%

REM Try to push
git push origin %BRANCH%

if errorlevel 1 (
    echo.
    echo ❌ Push failed!
    echo.
    echo Common issues:
    echo 1. Remote repository not configured
    echo    Fix: git remote add origin ^<your-repo-url^>
    echo.
    echo 2. Branch not tracking remote
    echo    Fix: git push --set-upstream origin %BRANCH%
    echo.
    echo 3. Authentication required
    echo    Fix: Configure git credentials
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Deployment successful!
echo.
echo 📊 Next steps:
echo 1. Check Vercel dashboard: https://vercel.com/dashboard
echo 2. Wait for deployment to complete (2-5 minutes)
echo 3. Run database setup in Supabase (see COMPLETE_FIX_GUIDE.md)
echo 4. Test the production site: https://no-duessystem.vercel.app
echo.
echo ⚠️  IMPORTANT: Database setup is REQUIRED for dropdowns to work!
echo    Run FINAL_COMPLETE_DATABASE_SETUP.sql in Supabase SQL Editor
echo.
pause