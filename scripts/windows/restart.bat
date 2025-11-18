@echo off
REM Glass Budget - Restart Application

echo Restarting Glass Budget...
pm2 restart glass-budget
if %errorLevel% equ 0 (
    echo Application restarted successfully!
    echo Access it at: http://localhost:3000
) else (
    echo Failed to restart application.
    echo Run 'status.bat' to check the current state.
)
echo.
pause
