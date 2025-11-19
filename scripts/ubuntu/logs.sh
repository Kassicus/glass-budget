#!/bin/bash

# Glass Budget - Logs Viewer Script

APP_NAME="glass-budget"
SERVICE_NAME="${APP_NAME}.service"

echo "Viewing Glass Budget logs (Ctrl+C to exit)..."
echo ""

# Follow logs in real-time
journalctl -u "$SERVICE_NAME" -f
