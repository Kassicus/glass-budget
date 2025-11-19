#!/bin/bash

# Glass Budget - Restart Script

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

APP_NAME="glass-budget"
SERVICE_NAME="${APP_NAME}.service"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: This script must be run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${BLUE}Restarting Glass Budget...${NC}"

systemctl restart "$SERVICE_NAME"

# Wait a moment
sleep 2

# Check status
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✓ Service restarted successfully${NC}"
    systemctl status "$SERVICE_NAME" --no-pager -l
else
    echo -e "${RED}✗ Service failed to start${NC}"
    journalctl -u "$SERVICE_NAME" -n 20 --no-pager
    exit 1
fi
