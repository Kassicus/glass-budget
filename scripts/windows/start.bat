@echo off
REM Glass Budget - Start Application

echo Starting Glass Budget...
pm2 start glass-budget
if %errorLevel% equ 0 (
    echo Application started successfully!
    echo Access it at: http://localhost:3000
) else (
    echo Failed to start application.
    echo Run 'status.bat' to check the current state.
)
echo.
pause
