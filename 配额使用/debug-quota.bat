@echo off
chcp 65001 >nul 2>nul
cls
echo.
echo ========================================
echo   Antigravity Quota Checker - DEBUG
echo ========================================
echo.

REM Check Node.js version
echo Checking Node.js version...
node --version
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)
echo.

REM Check if fetch is available
echo Checking fetch API support...
node -e "console.log(typeof fetch === 'function' ? '[OK] fetch is available' : '[ERROR] fetch not available')"
echo.

REM Check accounts file
set "ACCOUNTS_FILE=%USERPROFILE%\.config\opencode\antigravity-accounts.json"
echo Checking accounts file...
echo Location: %ACCOUNTS_FILE%
if exist "%ACCOUNTS_FILE%" (
    echo [OK] File exists
    echo.
    echo File size:
    dir "%ACCOUNTS_FILE%" | findstr antigravity-accounts.json
) else (
    echo [ERROR] File not found!
    echo.
    echo Please run: opencode auth login
    pause
    exit /b 1
)
echo.

REM Test internet connection
echo Testing internet connection...
ping -n 1 google.com >nul 2>nul
if errorlevel 1 (
    echo [WARNING] Cannot reach google.com
    echo Please check your internet connection
) else (
    echo [OK] Internet connection is working
)
echo.

REM Test OAuth endpoint
echo Testing OAuth endpoint...
ping -n 1 oauth2.googleapis.com >nul 2>nul
if errorlevel 1 (
    echo [WARNING] Cannot reach oauth2.googleapis.com
    echo This might be a DNS or firewall issue
) else (
    echo [OK] Can reach OAuth endpoint
)
echo.

REM Test Antigravity endpoint
echo Testing Antigravity endpoint...
ping -n 1 cloudcode-pa.googleapis.com >nul 2>nul
if errorlevel 1 (
    echo [WARNING] Cannot reach cloudcode-pa.googleapis.com
    echo This might be a DNS or firewall issue
) else (
    echo [OK] Can reach Antigravity endpoint
)
echo.

echo ========================================
echo   Running quota checker with debug...
echo ========================================
echo.

node "%~dp0antigravity-quota-checker.js"

echo.
echo ========================================
echo   Debug complete
echo ========================================
pause
