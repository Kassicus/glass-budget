@echo off
REM Glass Budget - Uninstall Windows Service

echo ====================================
echo Glass Budget - Service Uninstallation
echo ====================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo WARNING: This will remove Glass Budget from Windows startup.
echo The application will no longer start automatically.
echo.
set /p CONFIRM="Are you sure you want to continue? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Uninstallation cancelled.
    pause
    exit /b 0
)

echo.
echo [1/4] Stopping application...
pm2 stop glass-budget
pm2 delete glass-budget
echo.

echo [2/4] Removing PM2 save file...
pm2 save --force
echo.

echo [3/4] Uninstalling PM2 Windows service...
pm2-service-uninstall
echo.

echo [4/4] Cleaning up...
echo Service uninstalled successfully.
echo.
echo Note: PM2 is still installed globally.
echo To completely remove PM2, run: npm uninstall -g pm2 pm2-windows-service
echo.
echo Your data and configuration files are preserved.
echo.
pause
