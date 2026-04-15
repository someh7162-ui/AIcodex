@echo off
setlocal EnableExtensions
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-submit.ps1" %*
exit /b %ERRORLEVEL%
