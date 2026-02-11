@echo off
chcp 65001 >nul 2>nul
cls
echo.
echo ========================================
echo   Configure Proxy Settings
echo ========================================
echo.
echo This script will help you set up proxy for the quota checker.
echo.

REM 提示用户输入代理信息
echo Please enter your proxy information:
echo.
echo Example: proxy.company.com:8080
echo       or 127.0.0.1:7897 (for local proxy like Clash/V2Ray)
echo.

set /p PROXY_SERVER="Proxy address (host:port): "

if "%PROXY_SERVER%"=="" (
    echo.
    echo [ERROR] Proxy address cannot be empty!
    pause
    exit /b 1
)

REM 构建代理 URL
set HTTP_PROXY=http://%PROXY_SERVER%
set HTTPS_PROXY=http://%PROXY_SERVER%

echo.
echo ========================================
echo   Proxy Configuration
echo ========================================
echo HTTP_PROXY  = %HTTP_PROXY%
echo HTTPS_PROXY = %HTTPS_PROXY%
echo ========================================
echo.

REM 保存配置到文件
echo @echo off > proxy-config.bat
echo REM Auto-generated proxy configuration >> proxy-config.bat
echo set HTTP_PROXY=%HTTP_PROXY% >> proxy-config.bat
echo set HTTPS_PROXY=%HTTPS_PROXY% >> proxy-config.bat
echo set NO_PROXY=localhost,127.0.0.1 >> proxy-config.bat

echo [OK] Proxy configuration saved to: proxy-config.bat
echo.
echo You can now use:
echo   - check-quota-with-proxy.bat
echo   - start-server-with-proxy.bat
echo.

pause
