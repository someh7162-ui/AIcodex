@echo off
setlocal EnableExtensions
chcp 65001 >nul

echo =====================================
echo   XjtravelApp Git Quick Submit
echo =====================================
echo.
set /p COMMIT_MSG=请输入提交说明（直接回车使用默认说明）: 
echo.

if defined COMMIT_MSG (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-submit.ps1" "%COMMIT_MSG%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-submit.ps1"
)

echo.
if errorlevel 1 (
  echo 执行失败，请查看上面的报错信息。
) else (
  echo 执行完成。
)
echo.
pause
exit /b %ERRORLEVEL%
