@echo off
cd /d "%~dp0"
echo =========================================
echo Cleaning up corrupted node_modules...
echo =========================================
if exist node_modules rmdir /s /q node_modules
echo.
echo =========================================
echo Installing dependencies (this may take a while)...
echo =========================================
call npm install
echo.
echo =========================================
echo Starting project...
echo =========================================
call npm run dev:all
pause
