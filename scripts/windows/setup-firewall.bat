@echo off
REM Glass Budget - Configure Windows Firewall

echo Configuring Windows Firewall for Glass Budget...

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Not running as Administrator.
    echo Firewall configuration requires admin privileges.
    echo Please run install-service.bat as Administrator.
    exit /b 1
)

REM Add firewall rule for port 3000
netsh advfirewall firewall delete rule name="Glass Budget" >nul 2>&1
netsh advfirewall firewall add rule name="Glass Budget" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1

if %errorLevel% equ 0 (
    echo Firewall rule added successfully!
    echo Port 3000 is now open for local network access.
) else (
    echo WARNING: Failed to configure firewall.
    echo You may need to manually allow port 3000 in Windows Firewall.
)
