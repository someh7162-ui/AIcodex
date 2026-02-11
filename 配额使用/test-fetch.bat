@echo off
chcp 65001 >nul 2>nul
cls
echo.
echo ========================================
echo   Test Fetch Functionality
echo ========================================
echo.

node "%~dp0test-fetch.js"

echo.
pause
