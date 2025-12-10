@echo off
setlocal enabledelayedexpansion

:: JECRC No Dues System - Project Cleanup (Windows)
:: This script removes all redundant documentation and SQL files

echo.
echo ========================================
echo   JECRC No Dues System - Cleanup
echo ========================================
echo.
echo WARNING: This will delete 42+ redundant files!
echo.
echo Files to be deleted:
echo   - 20 redundant documentation files
echo   - 20+ redundant SQL scripts
echo   - 2 redundant test scripts
echo   - 2 sensitive files
echo.
set /p CONFIRM="Are you sure you want to continue? (y/n): "
if /i not "!CONFIRM!"=="y" (
    echo.
    echo Cleanup cancelled.
    pause
    exit /b 0
)
echo.

set DELETED_COUNT=0

:: Delete redundant documentation files
echo Deleting redundant documentation files...
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
echo.

:: Delete redundant SQL scripts
echo Deleting redundant SQL scripts...
echo ------------------------------------
call :delete_file "CHECK_AND_FIX_RLS.sql"
call :delete_file "COMPLETE_DATABASE_RESET_WITH_ALL_DATA.sql"
call :delete_file "COMPLETE_DATABASE_RESET.sql"
call :delete_file "FIX_MISSING_COLUMNS.sql"
call :delete_file "FIX_PRODUCTION_DATABASE.sql"
call :delete_file "scripts\add-manual-entry-flag.sql"
call :delete_file "scripts\add-manual-entry-system.sql"
call :delete_file "scripts\check-current-accounts-simple.sql"
call :delete_file "scripts\check-current-accounts.sql"
call :delete_file "scripts\create-accounts-from-csv.sql"
call :delete_file "scripts\create-all-staff-accounts.js"
call :delete_file "scripts\create-config-tables.sql"
call :delete_file "scripts\enable-realtime-replica-identity.sql"
call :delete_file "scripts\enable-realtime.sql"
call :delete_file "scripts\fix-college-email-domain.sql"
call :delete_file "scripts\fix-rls-policies.sql"
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

:: Delete redundant test scripts
echo Deleting redundant test scripts...
echo -------------------------------------
call :delete_file "scripts\test-api-endpoint.js"
call :delete_file "scripts\test-complete-system.js"
echo.

:: Delete sensitive files
echo Deleting sensitive files...
echo ------------------------------
call :delete_file "ACCOUNT_CREDENTIALS.csv"
call :delete_file "jecrc-key.pem"
call :delete_file "scripts\deploy-to-aws.sh"
echo.

echo ========================================
echo   CLEANUP COMPLETE!
echo ========================================
echo.
echo Summary:
echo   - Files deleted: %DELETED_COUNT%
echo   - Files kept:
echo     - COMPLETE_ISSUES_AND_CLEANUP.md
echo     - FINAL_COMPLETE_DATABASE_SETUP.sql
echo     - scripts\check-database-status.js
echo     - scripts\test-all-features.js
echo     - scripts\create-admin-account.js
echo     - All source code (src\)
echo.
echo Next steps:
echo   1. Review changes: git status
echo   2. Commit cleanup: git add . ^&^& git commit -m "Clean up redundant files"
echo   3. Deploy: DEPLOY_TO_PRODUCTION.bat
echo.
pause
exit /b 0

:delete_file
if exist %~1 (
    del %~1
    echo Deleted: %~1
    set /a DELETED_COUNT+=1
) else (
    echo Not found: %~1
)
exit /b 0