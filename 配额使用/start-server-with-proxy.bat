@echo off
chcp 65001 >nul 2>nul
cls
echo.
echo ========================================
echo   Antigravity Server (Proxy)
echo ========================================
echo.

REM 检查是否存在代理配置
if not exist "%~dp0proxy-config.bat" (
    echo [WARNING] Proxy configuration not found!
    echo.
    echo Please run setup-proxy.bat first to configure proxy.
    echo.
    pause
    exit /b 1
)

REM 加载代理配置
call "%~dp0proxy-config.bat"

echo Proxy Settings:
echo   HTTP_PROXY  = %HTTP_PROXY%
echo   HTTPS_PROXY = %HTTPS_PROXY%
echo.

REM 检查 Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查账户文件
set "ACCOUNTS_FILE=%USERPROFILE%\.config\opencode\antigravity-accounts.json"
if not exist "%ACCOUNTS_FILE%" (
    echo [WARNING] Account file not found!
    echo Location: %ACCOUNTS_FILE%
    echo.
    echo Please run: opencode auth login
    pause
    exit /b 1
)

echo [OK] All checks passed
echo.
echo Starting server with proxy...
echo.
echo ----------------------------------------
echo.

node "%~dp0antigravity-server.js"

echo.
echo ----------------------------------------
echo Server stopped.
echo.
pause
