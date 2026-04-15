@echo off
setlocal EnableExtensions
chcp 65001 >nul

echo =====================================
echo   XjtravelApp Git Quick Submit
echo =====================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-submit.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Submit failed. Check the messages above.
) else (
  echo Submit finished.
)
echo.
pause
exit /b %EXIT_CODE%
