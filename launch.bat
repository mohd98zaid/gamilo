@echo off
title Gmailo Platform
cd /d "%~dp0"

echo ========================================================
echo        Starting Gmailo Marketing Automation SaaS
echo ========================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if node_modules exists, install if missing
if not exist "node_modules\" (
    echo [INFO] First time setup: Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [INFO] Opening default browser at http://localhost:3000 in 3 seconds...
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

echo [INFO] Starting Next.js application server...
echo Press Ctrl+C in this terminal window to stop the server.
echo.

call npm run dev

pause
