@echo off
chcp 65001 >nul
title 自动Git提交工具

echo ==========================================
echo       自动 Git 提交助手
echo ==========================================

rem 检查是否存在 .git 目录
if not exist .git (
    echo [错误] 当前目录不是 Git 仓库。
    echo 请先运行 'git init' 初始化仓库。
    echo.
    pause
    exit /b
)

echo.
echo [1/3] 正在添加文件 (git add .)...
git add .

echo.
echo [2/3] 提交更改
set "msg="
set /p "msg=请输入提交信息 (直接回车将使用当前时间): "

if "%msg%"=="" (
    set "msg=Auto update: %date% %time%"
)

git commit -m "%msg%"

echo.
echo [3/3] 是否推送到远程仓库? (git push)
set /p "should_push=输入 y 推送，其他键跳过: "

if /i "%should_push%"=="y" (
    echo 正在推送...
    git push
) else (
    echo 已跳过推送。
)

echo.
echo ==========================================
echo 操作完成！
timeout /t 3
