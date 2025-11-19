#!/bin/bash

# Glass Budget - Update Script
# Run this script to update the application to the latest version

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="glass-budget"
APP_DIR="/opt/glass-budget"
SERVICE_NAME="${APP_NAME}.service"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Glass Budget Update${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Check if application is installed
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}ERROR: Application not found at $APP_DIR${NC}"
    echo "Please run install.sh first"
    exit 1
fi

# Get the current directory (where update.sh is being run from)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "${SCRIPT_DIR}/../.." && pwd )"

echo -e "${BLUE}[1/8]${NC} Checking for updates..."

# Check if we're in a git repository
if [ -d "${PROJECT_DIR}/.git" ]; then
    cd "$PROJECT_DIR"

    # Fetch latest changes
    git fetch origin

    # Check if there are updates
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")

    if [ -z "$REMOTE" ]; then
        echo -e "${YELLOW}⚠${NC}  Not tracking a remote branch"
        echo "Using local changes..."
    elif [ "$LOCAL" = "$REMOTE" ]; then
        echo -e "${YELLOW}⚠${NC}  Already up to date with remote"
        echo "Continuing with local changes..."
    else
        echo -e "${GREEN}✓${NC} Updates available, pulling changes..."
        git pull
    fi
else
    echo -e "${YELLOW}⚠${NC}  Not a git repository, using current files"
fi

echo ""
echo -e "${BLUE}[2/8]${NC} Stopping service..."

# Check if service is running
if systemctl is-active --quiet "$SERVICE_NAME"; then
    systemctl stop "$SERVICE_NAME"
    echo -e "${GREEN}✓${NC} Service stopped"
else
    echo -e "${YELLOW}⚠${NC}  Service was not running"
fi

echo ""
echo -e "${BLUE}[3/8]${NC} Backing up database..."

# Create backup directory if it doesn't exist
BACKUP_DIR="${APP_DIR}/backups"
mkdir -p "$BACKUP_DIR"

# Backup database if it exists
if [ -f "${APP_DIR}/data/production.db" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    cp "${APP_DIR}/data/production.db" "${BACKUP_DIR}/production_${TIMESTAMP}.db"
    echo -e "${GREEN}✓${NC} Database backed up to ${BACKUP_DIR}/production_${TIMESTAMP}.db"

    # Keep only last 5 backups
    ls -t ${BACKUP_DIR}/production_*.db | tail -n +6 | xargs -r rm
else
    echo -e "${YELLOW}⚠${NC}  No database found to backup"
fi

echo ""
echo -e "${BLUE}[4/8]${NC} Copying updated files..."

# Copy updated files (preserving .env.production and database)
rsync -av --exclude='node_modules' \
          --exclude='.next' \
          --exclude='.git' \
          --exclude='*.log' \
          --exclude='*.db' \
          --exclude='*.db-journal' \
          --exclude='.env.production' \
          --exclude='.env' \
          --exclude='data/' \
          --exclude='backups/' \
          "${PROJECT_DIR}/" "$APP_DIR/"

echo -e "${GREEN}✓${NC} Files updated"

echo ""
echo -e "${BLUE}[5/8]${NC} Installing dependencies..."

cd "$APP_DIR"
npm install --production=false
echo -e "${GREEN}✓${NC} Dependencies updated"

echo ""
echo -e "${BLUE}[6/8]${NC} Running database migrations..."

npm run db:migrate
echo -e "${GREEN}✓${NC} Database migrations complete"

echo ""
echo -e "${BLUE}[7/8]${NC} Building application..."

# Remove old build
rm -rf .next

# Build new version
npm run build
echo -e "${GREEN}✓${NC} Application rebuilt"

echo ""
echo -e "${BLUE}[8/8]${NC} Starting service..."

# Ensure proper permissions
chown -R glass-budget:glass-budget "$APP_DIR"
chown -R glass-budget:glass-budget /var/log/glass-budget

# Start service
systemctl start "$SERVICE_NAME"

# Wait a moment for service to start
sleep 2

# Check if service started successfully
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✓${NC} Service started successfully"
else
    echo -e "${RED}✗${NC} Service failed to start"
    echo ""
    echo -e "${RED}Error logs:${NC}"
    journalctl -u "$SERVICE_NAME" -n 20 --no-pager
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Update Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Show service status
systemctl status "$SERVICE_NAME" --no-pager -l

echo ""
echo -e "${BLUE}Application is now running the latest version${NC}"
echo -e "Access at: ${GREEN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo ""
echo -e "View logs with: ${YELLOW}sudo journalctl -u ${SERVICE_NAME} -f${NC}"
echo -e "Or use:         ${YELLOW}${APP_DIR}/scripts/ubuntu/logs.sh${NC}"
echo ""
