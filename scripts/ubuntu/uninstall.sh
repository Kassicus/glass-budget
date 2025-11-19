#!/bin/bash

# Glass Budget - Uninstall Script
# WARNING: This will remove the application and its data

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="glass-budget"
APP_USER="glass-budget"
APP_DIR="/opt/glass-budget"
LOG_DIR="/var/log/glass-budget"
SERVICE_NAME="${APP_NAME}.service"

echo -e "${RED}========================================${NC}"
echo -e "${RED}  Glass Budget Uninstall${NC}"
echo -e "${RED}========================================${NC}"
echo ""
echo -e "${YELLOW}WARNING: This will remove the application and all its data!${NC}"
echo -e "${YELLOW}This action cannot be undone.${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Uninstall cancelled."
    exit 0
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: This script must be run as root (use sudo)${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}[1/6]${NC} Stopping service..."

if systemctl is-active --quiet "$SERVICE_NAME"; then
    systemctl stop "$SERVICE_NAME"
    echo -e "${GREEN}✓${NC} Service stopped"
else
    echo -e "${YELLOW}⚠${NC}  Service was not running"
fi

echo ""
echo -e "${BLUE}[2/6]${NC} Disabling service..."

if systemctl is-enabled --quiet "$SERVICE_NAME"; then
    systemctl disable "$SERVICE_NAME"
    echo -e "${GREEN}✓${NC} Service disabled"
else
    echo -e "${YELLOW}⚠${NC}  Service was not enabled"
fi

echo ""
echo -e "${BLUE}[3/6]${NC} Removing service file..."

if [ -f "/etc/systemd/system/${SERVICE_NAME}" ]; then
    rm "/etc/systemd/system/${SERVICE_NAME}"
    systemctl daemon-reload
    echo -e "${GREEN}✓${NC} Service file removed"
else
    echo -e "${YELLOW}⚠${NC}  Service file not found"
fi

echo ""
echo -e "${BLUE}[4/6]${NC} Removing application directory..."

if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
    echo -e "${GREEN}✓${NC} Application directory removed"
else
    echo -e "${YELLOW}⚠${NC}  Application directory not found"
fi

echo ""
echo -e "${BLUE}[5/6]${NC} Removing log directory..."

if [ -d "$LOG_DIR" ]; then
    rm -rf "$LOG_DIR"
    echo -e "${GREEN}✓${NC} Log directory removed"
else
    echo -e "${YELLOW}⚠${NC}  Log directory not found"
fi

echo ""
echo -e "${BLUE}[6/6]${NC} Removing system user..."

if id "$APP_USER" &>/dev/null; then
    userdel "$APP_USER"
    echo -e "${GREEN}✓${NC} User removed"
else
    echo -e "${YELLOW}⚠${NC}  User not found"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Uninstall Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Glass Budget has been completely removed from your system."
echo ""
