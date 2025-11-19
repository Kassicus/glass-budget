#!/bin/bash

# Glass Budget - Ubuntu Installation Script
# This script installs and configures Glass Budget as a systemd service

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="glass-budget"
APP_USER="glass-budget"
APP_DIR="/opt/glass-budget"
LOG_DIR="/var/log/glass-budget"
DATA_DIR="${APP_DIR}/data"
SERVICE_NAME="${APP_NAME}.service"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Glass Budget Installation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Get the actual user who ran sudo
ACTUAL_USER="${SUDO_USER:-$USER}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "${SCRIPT_DIR}/../.." && pwd )"

echo -e "${BLUE}[1/11]${NC} Checking prerequisites..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    echo "Please install Node.js 18 or higher:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}ERROR: Node.js version 18 or higher is required${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node -v) found"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm $(npm -v) found"

# Check for git
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}WARNING: git is not installed${NC}"
    echo "Git is recommended for easy updates. Install with: sudo apt-get install git"
fi

echo ""
echo -e "${BLUE}[2/11]${NC} Creating system user..."

# Create dedicated user if it doesn't exist
if ! id "$APP_USER" &>/dev/null; then
    useradd --system --no-create-home --shell /bin/false "$APP_USER"
    echo -e "${GREEN}✓${NC} Created user: $APP_USER"
else
    echo -e "${YELLOW}✓${NC} User already exists: $APP_USER"
fi

echo ""
echo -e "${BLUE}[3/11]${NC} Creating directories..."

# Create application directory
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$DATA_DIR"

echo -e "${GREEN}✓${NC} Created directories"

echo ""
echo -e "${BLUE}[4/11]${NC} Copying application files..."

# Copy application files (excluding node_modules, .next, etc.)
rsync -av --exclude='node_modules' \
          --exclude='.next' \
          --exclude='.git' \
          --exclude='*.log' \
          --exclude='*.db' \
          --exclude='*.db-journal' \
          --exclude='.env.production' \
          --exclude='.env' \
          "${PROJECT_DIR}/" "$APP_DIR/"

echo -e "${GREEN}✓${NC} Application files copied"

echo ""
echo -e "${BLUE}[5/11]${NC} Setting up environment configuration..."

# Create .env.production if it doesn't exist
if [ ! -f "${APP_DIR}/.env.production" ]; then
    if [ -f "${PROJECT_DIR}/.env.production" ]; then
        # Copy existing .env.production
        cp "${PROJECT_DIR}/.env.production" "${APP_DIR}/.env.production"
        echo -e "${GREEN}✓${NC} Copied existing .env.production"
    else
        # Create from template
        cat > "${APP_DIR}/.env.production" << 'EOF'
# Database
DATABASE_URL="file:./data/production.db"

# NextAuth Configuration
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"

# Node Environment
NODE_ENV="production"
EOF

        # Generate secure NEXTAUTH_SECRET
        SECRET=$(openssl rand -base64 32)
        sed -i "s|NEXTAUTH_SECRET=\"\"|NEXTAUTH_SECRET=\"${SECRET}\"|" "${APP_DIR}/.env.production"

        echo -e "${GREEN}✓${NC} Created .env.production with secure secret"
        echo -e "${YELLOW}⚠${NC}  Please update NEXTAUTH_URL in ${APP_DIR}/.env.production with your server's IP/domain"
    fi
else
    echo -e "${YELLOW}✓${NC} .env.production already exists"
fi

echo ""
echo -e "${BLUE}[6/11]${NC} Installing dependencies..."
cd "$APP_DIR"
npm install --production=false
echo -e "${GREEN}✓${NC} Dependencies installed"

echo ""
echo -e "${BLUE}[7/11]${NC} Setting up database..."
npm run db:setup
echo -e "${GREEN}✓${NC} Database initialized"

echo ""
echo -e "${BLUE}[8/11]${NC} Building application..."
npm run build
echo -e "${GREEN}✓${NC} Application built successfully"

echo ""
echo -e "${BLUE}[9/11]${NC} Setting permissions..."

# Set ownership
chown -R ${APP_USER}:${APP_USER} "$APP_DIR"
chown -R ${APP_USER}:${APP_USER} "$LOG_DIR"

# Set proper permissions
chmod 755 "$APP_DIR"
chmod 750 "${APP_DIR}/.env.production"
chmod 755 "$LOG_DIR"

echo -e "${GREEN}✓${NC} Permissions configured"

echo ""
echo -e "${BLUE}[10/11]${NC} Installing systemd service..."

# Copy service file
cp "${APP_DIR}/scripts/ubuntu/${SERVICE_NAME}" "/etc/systemd/system/${SERVICE_NAME}"

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable "$SERVICE_NAME"

# Start service
systemctl start "$SERVICE_NAME"

echo -e "${GREEN}✓${NC} Service installed and started"

echo ""
echo -e "${BLUE}[11/11]${NC} Configuring firewall (optional)..."

# Configure UFW if available
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        ufw allow 3000/tcp comment "Glass Budget"
        echo -e "${GREEN}✓${NC} Firewall rule added (port 3000)"
    else
        echo -e "${YELLOW}⚠${NC}  UFW is installed but not active"
    fi
else
    echo -e "${YELLOW}⚠${NC}  UFW not installed, skipping firewall configuration"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Service Status: $(systemctl is-active $SERVICE_NAME)"
echo ""
echo -e "Configuration file: ${YELLOW}${APP_DIR}/.env.production${NC}"
echo -e "Application logs:   ${YELLOW}${LOG_DIR}/${NC}"
echo ""
echo -e "${BLUE}Management Commands:${NC}"
echo -e "  Status:    ${YELLOW}sudo systemctl status ${SERVICE_NAME}${NC}"
echo -e "  Stop:      ${YELLOW}sudo systemctl stop ${SERVICE_NAME}${NC}"
echo -e "  Start:     ${YELLOW}sudo systemctl start ${SERVICE_NAME}${NC}"
echo -e "  Restart:   ${YELLOW}sudo systemctl restart ${SERVICE_NAME}${NC}"
echo -e "  Logs:      ${YELLOW}sudo journalctl -u ${SERVICE_NAME} -f${NC}"
echo -e "  Or use:    ${YELLOW}${APP_DIR}/scripts/ubuntu/status.sh${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Update NEXTAUTH_URL in ${APP_DIR}/.env.production"
echo -e "2. Access the application at: ${GREEN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "3. Register your first user account"
echo ""
echo -e "${BLUE}For easy updates, use:${NC} ${YELLOW}${APP_DIR}/scripts/ubuntu/update.sh${NC}"
echo ""
