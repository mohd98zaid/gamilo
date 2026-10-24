@echo off
setlocal EnableExtensions
title Gamilo Platform
pushd "%~dp0"

echo ========================================================
echo        Starting Gamilo Marketing Automation SaaS
echo ========================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 20 or newer from https://nodejs.org/
    pause
    popd
    exit /b 1
)

:: Require a local environment file so secrets are never fabricated.
if not exist ".env" (
    echo [ERROR] .env was not found.
    echo Copy .env.example to .env, configure the required values, and run this file again.
    echo.
    echo Example: copy .env.example .env
    pause
    popd
    exit /b 1
)

:: Local development uses the repository's SQLite database. This override
:: keeps a cloud DATABASE_URL in .env from blocking local development.
set "DATABASE_URL=file:./dev.db"
set "NODE_ENV=development"

:: Install exactly what package-lock.json specifies.
if not exist "node_modules\.bin\next.cmd" (
    echo [INFO] Installing locked dependencies with npm ci...
    call npm ci
    if errorlevel 1 (
        echo [ERROR] npm ci failed.
        pause
        popd
        exit /b 1
    )
)

echo [INFO] Preparing Prisma client and local SQLite database...
call npm run db:generate
if errorlevel 1 (
    if exist "node_modules\.prisma\client\index.js" (
        echo [INFO] Existing Prisma client detected, continuing...
    ) else (
        echo [ERROR] Prisma client generation failed.
        pause
        popd
        exit /b 1
    )
)

call npm run db:push
if errorlevel 1 (
    echo [ERROR] Local database preparation failed.
    pause
    popd
    exit /b 1
)

echo [INFO] Opening default browser at http://localhost:3000 in 4 seconds...
start "Gamilo Browser" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

echo [INFO] Starting Next.js application server...
echo Press Ctrl+C in this terminal window to stop the server.
echo.

call npm run dev

popd
pause
