@echo off
setlocal enabledelayedexpansion

:: JECRC No Dues System - COMPLETE CLEANUP
:: Keeps only ONE SQL file and removes ALL redundant documents

echo.
echo ========================================
echo   COMPLETE PROJECT CLEANUP
echo ========================================
echo.
echo This will DELETE ALL redundant files:
echo   - ALL SQL files except FINAL_COMPLETE_DATABASE_SETUP.sql
echo   - ALL redundant documentation
echo   - ALL redundant test scripts
echo   - Sensitive files
echo.
echo KEEPING ONLY:
echo   - FINAL_COMPLETE_DATABASE_SETUP.sql (1 SQL file)
echo   - PROJECT_OVERVIEW.md (Complete feature list)
echo   - Source code (src/)
echo   - Essential scripts (5 files)
echo.
set /p CONFIRM="Are you ABSOLUTELY sure? (yes/no): "
if /i not "!CONFIRM!"=="yes" (
    echo Cleanup cancelled.
    pause
    exit /b 0
)
echo.

set DELETED_COUNT=0

:: ===========================================
:: DELETE ALL REDUNDANT DOCUMENTATION
:: ===========================================
echo [1/4] Deleting redundant documentation...
echo -------------------------------------------
call :delete_file "ALL_ISSUES_FIXED.md"
call :delete_file "COMPLETE_FIX_GUIDE.md"
call :delete_file "COMPLETE_SETUP_GUIDE.md"
call :delete_file "COMPLETE_SETUP_WITH_STAFF_AND_EMAILS.md"
call :delete_file "DEPLOY_FIX_NOW.md"
call :delete_file "DEPLOY_NOW.bat"
call :delete_file "DEPLOY_NOW.sh"
call :delete_file "DEPLOYMENT_GUIDE.md"
call :delete_file "DEPLOYMENT_WARNINGS_EXPLAINED.md"
call :delete_file "FINAL_SOLUTION_SUMMARY.md"
call :delete_file "FIX_COLLEGE_EMAIL_ISSUE.md"
call :delete_file "FIX_EVERYTHING_COMPLETE_GUIDE.md"
call :delete_file "FIX_EVERYTHING_NOW.md"
call :delete_file "QUICK_START.md"
call :delete_file "README_HOSTING.md"
call :delete_file "STAFF_ACCOUNTS_SETUP_GUIDE.md"
call :delete_file "SYSTEM_STATUS_REPORT.md"
call :delete_file "VERCEL_ENV_SETUP.md"
call :delete_file "VISUAL_ENHANCEMENTS_GUIDE.md"
call :delete_file "COMPREHENSIVE_FIX_AND_DEPLOY.md"
call :delete_file "DEPLOY_FIXES_NOW.md"
call :delete_file "COMPLETE_ISSUES_AND_CLEANUP.md"
call :delete_file "HOSTING_OPTIONS.md"
call :delete_file "BACKGROUND_ANIMATION_PERFORMANCE_ANALYSIS.md"
call :delete_file "EC2_MICRO_DEPLOYMENT_GUIDE.md"
echo.

:: ===========================================
:: DELETE ALL SQL FILES EXCEPT ONE
:: ===========================================
echo [2/4] Deleting ALL SQL files except FINAL_COMPLETE_DATABASE_SETUP.sql...
echo ---------------------------------------------------------------------
call :delete_file "CHECK_AND_FIX_RLS.sql"
call :delete_file "COMPLETE_DATABASE_RESET_WITH_ALL_DATA.sql"
call :delete_file "COMPLETE_DATABASE_RESET.sql"
call :delete_file "FIX_MISSING_COLUMNS.sql"
call :delete_file "FIX_PRODUCTION_DATABASE.sql"
call :delete_file "scripts\add-blockchain-verification.sql"
call :delete_file "scripts\add-manual-entry-flag.sql"
call :delete_file "scripts\add-manual-entry-system.sql"
call :delete_file "scripts\add-staff-scope.sql"
call :delete_file "scripts\backfill-existing-rejected-forms.sql"
call :delete_file "scripts\check-current-accounts-simple.sql"
call :delete_file "scripts\check-current-accounts.sql"
call :delete_file "scripts\cleanup-database.sql"
call :delete_file "scripts\create-accounts-from-csv.sql"
call :delete_file "scripts\create-config-tables.sql"
call :delete_file "scripts\create-test-data.sql"
call :delete_file "scripts\enable-realtime-replica-identity.sql"
call :delete_file "scripts\enable-realtime.sql"
call :delete_file "scripts\fix-college-email-domain.sql"
call :delete_file "scripts\fix-rls-policies.sql"
call :delete_file "scripts\fix-role-constraint-correct-order.sql"
call :delete_file "scripts\fix-role-constraint.sql"
call :delete_file "scripts\FIXED_CONFIGURATION_SETUP.sql"
call :delete_file "scripts\ONE_CLICK_FIX_ALL_ISSUES.sql"
call :delete_file "scripts\optimize-realtime-triggers.sql"
call :delete_file "scripts\populate-config-tables.sql"
call :delete_file "scripts\setup-reapplication-system.sql"
call :delete_file "scripts\unify-notification-system.sql"
call :delete_file "scripts\update-department-emails.sql"
call :delete_file "scripts\update-department-notification-emails.sql"
call :delete_file "scripts\update-department-order.sql"
call :delete_file "scripts\update-manual-entries-table.sql"
call :delete_file "scripts\update-staff-role.sql"
call :delete_file "scripts\verify-and-fix-database.sql"
call :delete_file "scripts\verify-realtime-complete.sql"
call :delete_file "scripts\verify-realtime-setup.sql"
echo.

:: ===========================================
:: DELETE REDUNDANT SCRIPTS
:: ===========================================
echo [3/4] Deleting redundant test scripts...
echo ------------------------------------------
call :delete_file "scripts\test-api-endpoint.js"
call :delete_file "scripts\test-complete-system.js"
call :delete_file "scripts\create-all-staff-accounts.js"
call :delete_file "scripts\test-send-notification.js"
call :delete_file "scripts\test-unified-notifications.js"
call :delete_file "scripts\deploy-to-aws.sh"
call :delete_file "deploy-ec2-micro.sh"
echo.

:: ===========================================
:: DELETE SENSITIVE FILES
:: ===========================================
echo [4/4] Deleting sensitive and unnecessary files...
echo --------------------------------------------------
call :delete_file "ACCOUNT_CREDENTIALS.csv"
call :delete_file "jecrc-key.pem"
call :delete_file "app-deploy-fixed.zip"
call :delete_file "amplify.yml"
call :delete_file "Dockerfile"
call :delete_file "vercel.json"
call :delete_file "test-dropdowns.html"
call :delete_file "test-schools-api.js"
echo.

:: ===========================================
:: SUMMARY
:: ===========================================
echo ========================================
echo   CLEANUP COMPLETE!
echo ========================================
echo.
echo Files deleted: %DELETED_COUNT%
echo.
echo KEPT FILES:
echo -------------------------------------------
echo SQL Database:
echo   - FINAL_COMPLETE_DATABASE_SETUP.sql
echo.
echo Documentation:
echo   - PROJECT_OVERVIEW.md (will be created next)
echo   - DEPLOY_TO_PRODUCTION.bat
echo.
echo Scripts:
echo   - scripts\check-database-status.js
echo   - scripts\test-all-features.js
echo   - scripts\create-admin-account.js
echo   - scripts\create-default-admin.js
echo   - scripts\create-specific-staff-accounts.js
echo   - scripts\check-env.js
echo   - scripts\setup-database.js
echo   - scripts\setup-storage.js
echo   - scripts\validate-credentials.js
echo.
echo Source Code:
echo   - src\** (ALL application code)
echo   - public\** (ALL assets)
echo.
echo Configuration:
echo   - .env.local, .env.example
echo   - package.json, next.config.mjs
echo   - All config files
echo.
echo Next Steps:
echo   1. Review: git status
echo   2. Commit: git add . ^&^& git commit -m "Clean up project"
echo   3. Deploy: DEPLOY_TO_PRODUCTION.bat
echo.
pause
exit /b 0

:delete_file
if exist %~1 (
    del %~1 2>nul
    if not exist %~1 (
        echo   [OK] %~1
        set /a DELETED_COUNT+=1
    ) else (
        echo   [FAIL] %~1
    )
) else (
    echo   [SKIP] %~1 (not found)
)
exit /b 0