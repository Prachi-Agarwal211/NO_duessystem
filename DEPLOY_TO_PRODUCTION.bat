@echo off
setlocal enabledelayedexpansion

:: JECRC No Dues System - Deploy to Production (Windows)
:: This script deploys your local fixes to Vercel production

echo.
echo ========================================
echo   JECRC No Dues System - Deployment
echo ========================================
echo.

:: Check current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.

:: Check for uncommitted changes
git status -s > temp.txt
set /a FILE_SIZE=0
for %%A in (temp.txt) do set FILE_SIZE=%%~zA
del temp.txt

if %FILE_SIZE% gtr 0 (
    echo WARNING: You have uncommitted changes!
    echo.
    git status -s
    echo.
    set /p COMMIT_CHOICE="Do you want to commit these changes? (y/n): "
    if /i "!COMMIT_CHOICE!"=="y" (
        echo.
        echo Committing changes...
        git add .
        set /p COMMIT_MSG="Enter commit message (or press Enter for default): "
        if "!COMMIT_MSG!"=="" (
            set COMMIT_MSG=Fix: Session year validation and production deployment
        )
        git commit -m "!COMMIT_MSG!"
        echo Changes committed!
    ) else (
        echo.
        echo Deployment cancelled. Please commit or stash your changes first.
        pause
        exit /b 1
    )
    echo.
)

:: Switch to render branch
echo Switching to 'render' branch (production branch)...
git checkout render
if errorlevel 1 (
    echo.
    echo ERROR: Failed to switch to render branch!
    echo Make sure the 'render' branch exists.
    pause
    exit /b 1
)
echo Switched to render branch
echo.

:: Merge from current branch
echo Merging changes from '%CURRENT_BRANCH%' branch...
git merge %CURRENT_BRANCH% -m "Merge fixes from %CURRENT_BRANCH% to production"
if errorlevel 1 (
    echo.
    echo ERROR: Merge failed! You may have conflicts to resolve.
    echo Resolve conflicts, then run: git merge --continue
    pause
    exit /b 1
)
echo Merge successful
echo.

:: Push to GitHub
echo Pushing to GitHub...
git push origin render
if errorlevel 1 (
    echo.
    echo ERROR: Push failed!
    echo Check your network connection and GitHub credentials.
    pause
    exit /b 1
)
echo Pushed to GitHub
echo.

:: Switch back to original branch
echo Switching back to '%CURRENT_BRANCH%' branch...
git checkout %CURRENT_BRANCH%
echo Back on %CURRENT_BRANCH% branch
echo.

echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your fixes are now being deployed to Vercel!
echo.
echo Next steps:
echo   1. Check Vercel dashboard for build status
echo   2. Wait 2-3 minutes for build to complete
echo   3. Test: https://no-duessystem.vercel.app
echo   4. Verify:
echo      - Session year fields (empty should work)
echo      - College email validation
echo      - Cascading dropdowns
echo.
echo Vercel Dashboard: https://vercel.com/dashboard
echo.
pause