@echo off
chcp 65001 >nul 2>nul
cls
echo.
echo ========================================
echo   Antigravity Quota Checker
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Recommended: LTS version
    echo.
    pause
    exit /b 1
)

REM Check if accounts file exists
set "ACCOUNTS_FILE=%USERPROFILE%\.config\opencode\antigravity-accounts.json"
if not exist "%ACCOUNTS_FILE%" (
    echo [WARNING] Account file not found!
    echo.
    echo Expected location:
    echo %ACCOUNTS_FILE%
    echo.
    echo Please run this command first:
    echo   opencode auth login
    echo.
    pause
    exit /b 1
)

echo [OK] Account file found
echo.
echo Checking quota...
echo.
echo ----------------------------------------
echo.

node "%~dp0antigravity-quota-checker.js"

echo.
pause
