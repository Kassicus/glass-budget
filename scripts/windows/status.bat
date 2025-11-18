@echo off
REM Glass Budget - Check Application Status

echo Glass Budget Status:
echo ==================
pm2 list
echo.
echo Detailed status:
pm2 show glass-budget
echo.
pause
