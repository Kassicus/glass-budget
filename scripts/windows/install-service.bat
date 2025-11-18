@echo off
REM Glass Budget - Windows Service Installation Script
REM This script sets up the application to run automatically on Windows startup

echo ====================================
echo Glass Budget - Service Installation
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

echo [1/11] Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
node --version
echo Node.js found!
echo.

echo [2/11] Creating required directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
echo Directories created successfully.
echo.

echo [3/11] Checking for .env.production file...
if not exist ".env.production" (
    echo WARNING: .env.production not found!
    echo Please create .env.production from .env.production.template
    echo and configure your settings before continuing.
    echo.
    pause
    exit /b 1
)
echo Configuration file found.
echo.

echo [4/11] Installing npm dependencies...
echo This may take a few minutes...
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo Dependencies installed successfully.
echo.

echo [5/11] Setting up database...
call npx prisma generate
if %errorLevel% neq 0 (
    echo ERROR: Failed to generate Prisma client!
    pause
    exit /b 1
)
call npx prisma migrate deploy
if %errorLevel% neq 0 (
    echo WARNING: Database migration had issues, but continuing...
    echo You may need to run migrations manually.
)
echo Database setup complete.
echo.

echo [6/11] Building production application...
echo This may take a few minutes...
call npm run build
if %errorLevel% neq 0 (
    echo ERROR: Failed to build application!
    pause
    exit /b 1
)
echo Build completed successfully.
echo.

echo [7/11] Installing PM2 process manager...
call npm install -g pm2
if %errorLevel% neq 0 (
    echo ERROR: Failed to install PM2!
    pause
    exit /b 1
)
echo PM2 installed successfully.
echo.

echo [8/11] Installing PM2 Windows service...
call npm install -g pm2-windows-service
if %errorLevel% neq 0 (
    echo ERROR: Failed to install pm2-windows-service!
    pause
    exit /b 1
)
echo PM2 Windows service installed.
echo.

echo [9/11] Setting up PM2 to run the application...
call pm2 start ecosystem.config.js
if %errorLevel% neq 0 (
    echo ERROR: Failed to start application with PM2!
    pause
    exit /b 1
)
call pm2 save
echo Application configured in PM2.
echo.

echo [10/11] Installing PM2 as Windows service...
call pm2-service-install -n PM2
if %errorLevel% neq 0 (
    echo WARNING: PM2 service installation may have had issues.
    echo The service might already be installed.
)
echo PM2 service configured.
echo.

echo [11/11] Configuring Windows Firewall...
call scripts\windows\setup-firewall.bat
echo Firewall configuration complete.
echo.

echo ====================================
echo Installation Complete!
echo ====================================
echo.
echo Your Glass Budget application is now running!
echo.
echo Access it at: http://YOUR_WINDOWS_IP:3000
echo To find your IP address, run: ipconfig
echo.
echo Management Commands:
echo   - View status:  scripts\windows\status.bat
echo   - View logs:    scripts\windows\logs.bat
echo   - Restart app:  scripts\windows\restart.bat
echo   - Stop app:     scripts\windows\stop.bat
echo.
echo The application will automatically start when Windows boots.
echo.
pause
