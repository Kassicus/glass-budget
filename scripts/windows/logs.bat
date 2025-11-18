@echo off
REM Glass Budget - View Application Logs

echo Glass Budget Logs:
echo ==================
echo.
echo Recent logs (press Ctrl+C to exit when done):
echo.
pm2 logs glass-budget --lines 50
