#!/bin/bash

# Glass Budget - Status Check Script

# Colors
BLUE='\033[0;34m'
NC='\033[0m'

APP_NAME="glass-budget"
SERVICE_NAME="${APP_NAME}.service"

echo -e "${BLUE}Glass Budget Service Status${NC}"
echo ""

# Show systemd service status
systemctl status "$SERVICE_NAME" --no-pager -l

echo ""
echo -e "${BLUE}Recent Logs (last 20 lines):${NC}"
journalctl -u "$SERVICE_NAME" -n 20 --no-pager
