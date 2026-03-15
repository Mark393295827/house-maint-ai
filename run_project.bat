@echo off
setlocal enabledelayedexpansion
CHCP 65001 > nul

:: ==========================================
:: House Maint AI - Startup Script
:: ==========================================

echo.
echo [1/4] Checking Environment...
if not exist ".env" (
    echo [!] .env file not found!
    set /p copy_env="Do you want to create one from .env.example? (y/n, default y): "
    if "!copy_env!"=="" set copy_env=y
    if /i "!copy_env!"=="y" (
        copy .env.example .env
        echo [+] Created .env file. Please edit it with your API keys.
    ) else (
        echo [!] Warning: Missing .env file may cause errors.
    )
) else (
    echo [+] .env file is ready.
)

echo.
echo [2/4] Dependency Check
set /p install="Do you want to install/update dependencies? (y/n, default n): "
set /p initdb="Do you want to initialize the database? (y/n, default n): "

if /i "%install%"=="y" (
    echo.
    echo [-] Installing root and frontend dependencies...
    call npm install
    echo [-] Installing backend dependencies...
    cd server && call npm install && cd ..
)

if /i "%initdb%"=="y" (
    echo.
    echo [-] Initializing database...
    cd server && call npm run init-db && cd ..
)

echo.
echo [3/4] Select Startup Mode
echo   1. Hybrid (Recommended: One window for all logs)
echo   2. Separate (Open separate windows for FE and BE)
echo.
set /p mode="Mode (1/2, default 1): "
if "%mode%"=="" set mode=1

echo.
echo [4/4] Starting Services...
echo ------------------------------------------

if "%mode%"=="1" goto hybrid_mode
goto separate_mode

:hybrid_mode
echo [*] Starting all services in Hybrid Mode...
npm run dev:all
goto end

:separate_mode
echo [*] Starting Backend (separate window)...
start "House Maint AI - Backend" cmd /c "cd server && npm run dev || pause"

echo [*] Starting Frontend (separate window)...
start "House Maint AI - Frontend" cmd /c "npm run dev || pause"

echo.
echo [+] Services started.
echo FE: http://localhost:5173
echo BE: http://localhost:3001
echo.
pause
goto end

:end
