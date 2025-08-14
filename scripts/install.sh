#!/bin/bash

# Glass Budget Installation Script for Ubuntu Server 24.04
# This script installs Glass Budget from the Debian package

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root. Please run as a regular user with sudo privileges."
    exit 1
fi

# Check Ubuntu version
if ! lsb_release -d | grep -q "Ubuntu 24.04"; then
    warn "This script is designed for Ubuntu 24.04. Your version:"
    lsb_release -d
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if user has sudo privileges
if ! sudo -n true 2>/dev/null; then
    error "User does not have sudo privileges. Please run: sudo usermod -aG sudo $(whoami)"
    exit 1
fi

log "Starting Glass Budget installation..."

# Update system packages
log "Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install required system packages
log "Installing system dependencies..."
sudo apt install -y \
    python3 \
    python3-venv \
    python3-pip \
    postgresql \
    postgresql-contrib \
    nginx \
    curl \
    wget \
    gnupg2 \
    software-properties-common \
    apt-transport-https \
    ca-certificates

# Function to download and install the latest package
install_glass_budget() {
    local REPO_URL="https://api.github.com/repos/your-org/glass-budget/releases/latest"
    local DOWNLOAD_URL
    
    log "Fetching latest Glass Budget release..."
    
    # Get the download URL for the .deb package
    DOWNLOAD_URL=$(curl -s "$REPO_URL" | grep "browser_download_url.*\.deb" | head -n 1 | cut -d '"' -f 4)
    
    if [ -z "$DOWNLOAD_URL" ]; then
        error "Could not find Glass Budget package download URL"
        error "Please visit https://github.com/your-org/glass-budget/releases and download manually"
        exit 1
    fi
    
    log "Downloading Glass Budget package..."
    local TEMP_DIR=$(mktemp -d)
    local DEB_FILE="$TEMP_DIR/glass-budget.deb"
    
    if ! curl -L -o "$DEB_FILE" "$DOWNLOAD_URL"; then
        error "Failed to download Glass Budget package"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    log "Installing Glass Budget package..."
    if ! sudo apt install -y "$DEB_FILE"; then
        error "Failed to install Glass Budget package"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # Clean up
    rm -rf "$TEMP_DIR"
}

# Configure PostgreSQL
configure_postgresql() {
    log "Configuring PostgreSQL..."
    
    # Start PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Create database and user
    local DB_NAME="glass_budget"
    local DB_USER="glass_budget"
    local DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
    
    # Update configuration with database credentials
    local DB_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
    sudo sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" /etc/glass-budget/glass-budget.env
    
    log "PostgreSQL configured with database: $DB_NAME, user: $DB_USER"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    # Get server IP or domain
    local SERVER_IP=$(hostname -I | awk '{print $1}')
    echo
    echo -e "${BLUE}Configure your domain:${NC}"
    echo "1. Use IP address: $SERVER_IP"
    echo "2. Enter custom domain name"
    read -p "Choose option (1/2) [1]: " -r DOMAIN_OPTION
    DOMAIN_OPTION=${DOMAIN_OPTION:-1}
    
    local DOMAIN="$SERVER_IP"
    if [ "$DOMAIN_OPTION" = "2" ]; then
        read -p "Enter your domain name (e.g., budget.example.com): " -r CUSTOM_DOMAIN
        if [ -n "$CUSTOM_DOMAIN" ]; then
            DOMAIN="$CUSTOM_DOMAIN"
        fi
    fi
    
    # Update nginx configuration
    sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/glass-budget
    
    # Enable the site
    if [ ! -L /etc/nginx/sites-enabled/glass-budget ]; then
        sudo ln -s /etc/nginx/sites-available/glass-budget /etc/nginx/sites-enabled/
    fi
    
    # Remove default site
    if [ -L /etc/nginx/sites-enabled/default ]; then
        sudo rm /etc/nginx/sites-enabled/default
    fi
    
    # Test and reload nginx
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log "Nginx configured for domain: $DOMAIN"
    else
        error "Nginx configuration test failed"
        return 1
    fi
}

# Configure SSL with Let's Encrypt
configure_ssl() {
    echo
    read -p "Do you want to configure SSL with Let's Encrypt? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Installing Certbot..."
        sudo apt install -y certbot python3-certbot-nginx
        
        read -p "Enter your email for SSL certificate: " -r SSL_EMAIL
        read -p "Enter your domain name: " -r SSL_DOMAIN
        
        if [ -n "$SSL_EMAIL" ] && [ -n "$SSL_DOMAIN" ]; then
            log "Obtaining SSL certificate..."
            if sudo certbot --nginx -d "$SSL_DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL"; then
                log "SSL certificate installed successfully"
                
                # Update nginx configuration to enable SSL settings
                sudo sed -i 's/# listen 443 ssl http2;/listen 443 ssl http2;/' /etc/nginx/sites-available/glass-budget
                sudo sed -i 's/# ssl_certificate/ssl_certificate/' /etc/nginx/sites-available/glass-budget
                sudo sed -i 's/# include \/etc\/letsencrypt/include \/etc\/letsencrypt/' /etc/nginx/sites-available/glass-budget
                sudo sed -i 's/# add_header Strict-Transport-Security/add_header Strict-Transport-Security/' /etc/nginx/sites-available/glass-budget
                
                sudo nginx -t && sudo systemctl reload nginx
            else
                warn "SSL certificate installation failed. You can configure it later with: sudo certbot --nginx"
            fi
        else
            warn "SSL configuration skipped due to missing information"
        fi
    fi
}

# Main installation process
main() {
    log "Glass Budget Installation for Ubuntu 24.04"
    echo "=========================================="
    echo
    
    # Install the package
    install_glass_budget
    
    # Configure database
    echo
    read -p "Do you want to configure PostgreSQL database? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        configure_postgresql
    else
        log "Skipping PostgreSQL configuration. Using SQLite database."
    fi
    
    # Configure Nginx
    echo
    read -p "Do you want to configure Nginx reverse proxy? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        configure_nginx
        configure_ssl
    else
        log "Skipping Nginx configuration. Service will run on localhost:5001"
    fi
    
    # Final configuration
    log "Performing final configuration..."
    
    # Restart Glass Budget service
    sudo systemctl restart glass-budget.service
    
    # Check service status
    if sudo systemctl is-active --quiet glass-budget.service; then
        log "Glass Budget service is running successfully"
    else
        error "Glass Budget service failed to start. Check logs with: sudo journalctl -u glass-budget.service"
        exit 1
    fi
    
    # Display installation summary
    echo
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}Glass Budget Installation Complete!${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo
    echo "Configuration file: /etc/glass-budget/glass-budget.env"
    echo "Application directory: /opt/glass-budget"
    echo "Data directory: /var/lib/glass-budget"
    echo "Log directory: /var/log/glass-budget"
    echo
    echo "Service commands:"
    echo "  Status: sudo systemctl status glass-budget"
    echo "  Restart: sudo systemctl restart glass-budget"
    echo "  Logs: sudo journalctl -u glass-budget.service -f"
    echo
    echo "Admin commands:"
    echo "  glass-budget-admin --help"
    echo
    
    if [ -L /etc/nginx/sites-enabled/glass-budget ]; then
        local DOMAIN=$(grep "server_name" /etc/nginx/sites-available/glass-budget | head -1 | awk '{print $2}' | tr -d ';')
        echo "Web interface: http://$DOMAIN"
        if sudo nginx -T 2>/dev/null | grep -q "listen.*443.*ssl"; then
            echo "HTTPS interface: https://$DOMAIN"
        fi
    else
        echo "Direct access: http://localhost:5001"
    fi
    
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Review and customize /etc/glass-budget/glass-budget.env"
    echo "2. Create your first user account through the web interface"
    echo "3. Set up regular backups with: glass-budget-admin backup"
    echo "4. Monitor logs and performance"
    echo
}

# Run main function
main "$@"