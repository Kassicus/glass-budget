@echo off
REM Glass Budget - Stop Application

echo Stopping Glass Budget...
pm2 stop glass-budget
if %errorLevel% equ 0 (
    echo Application stopped successfully!
) else (
    echo Failed to stop application.
    echo The application may not be running.
)
echo.
pause
