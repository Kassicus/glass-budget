#!/bin/bash

# Glass Budget Update Script
# Updates the Glass Budget application to the latest version

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_NAME="glass-budget"
SERVICE_NAME="glass-budget"
BACKUP_DIR="/var/lib/glass-budget/backups"
UPDATE_LOG="/var/log/glass-budget/update.log"

# Logging functions
log() {
    echo -e "${GREEN}[UPDATE]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [UPDATE] $1" >> "$UPDATE_LOG"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1" >> "$UPDATE_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$UPDATE_LOG"
}

# Check if running as root or with sudo
check_privileges() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Create backup before update
create_backup() {
    log "Creating backup before update..."
    
    if command -v glass-budget-admin >/dev/null 2>&1; then
        glass-budget-admin backup
        log "Backup created successfully"
    else
        warn "glass-budget-admin not found, creating manual backup..."
        
        local BACKUP_NAME="pre-update-backup-$(date +%Y%m%d-%H%M%S)"
        local BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
        
        mkdir -p "$BACKUP_PATH"
        
        # Backup database and config
        if [ -f "/var/lib/glass-budget/budget.db" ]; then
            cp "/var/lib/glass-budget/budget.db" "$BACKUP_PATH/"
        fi
        
        if [ -f "/etc/glass-budget/glass-budget.env" ]; then
            cp "/etc/glass-budget/glass-budget.env" "$BACKUP_PATH/"
        fi
        
        # Create archive
        tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
        rm -rf "$BACKUP_PATH"
        
        log "Manual backup created: $BACKUP_PATH.tar.gz"
    fi
}

# Check for available updates
check_updates() {
    log "Checking for available updates..."
    
    apt update
    
    local AVAILABLE_VERSION=$(apt list --upgradable 2>/dev/null | grep $PACKAGE_NAME | awk '{print $2}' | head -n1)
    local INSTALLED_VERSION=$(dpkg -l | grep $PACKAGE_NAME | awk '{print $3}')
    
    if [ -n "$AVAILABLE_VERSION" ]; then
        log "Update available: $INSTALLED_VERSION -> $AVAILABLE_VERSION"
        return 0
    else
        log "No updates available. Current version: $INSTALLED_VERSION"
        return 1
    fi
}

# Perform the update
perform_update() {
    log "Starting Glass Budget update..."
    
    # Stop service
    log "Stopping Glass Budget service..."
    systemctl stop $SERVICE_NAME
    
    # Perform update
    log "Installing package updates..."
    apt install --only-upgrade $PACKAGE_NAME -y
    
    # Run database migrations
    log "Running database migrations..."
    cd /opt/glass-budget
    sudo -u glass-budget /opt/glass-budget/venv/bin/python migrate_db.py
    
    # Reload systemd in case service file changed
    systemctl daemon-reload
    
    # Start service
    log "Starting Glass Budget service..."
    systemctl start $SERVICE_NAME
    
    # Wait a moment and check if service is running
    sleep 5
    if systemctl is-active --quiet $SERVICE_NAME; then
        log "Service started successfully"
    else
        error "Service failed to start after update"
        log "Checking service status..."
        systemctl status $SERVICE_NAME --no-pager -l
        return 1
    fi
    
    # Health check
    log "Performing health check..."
    local HEALTH_URL="http://localhost:5001/health"
    local MAX_ATTEMPTS=10
    local ATTEMPT=1
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if curl -s "$HEALTH_URL" | grep -q '"status":"healthy"'; then
            log "Health check passed"
            break
        else
            if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
                warn "Health check failed after $MAX_ATTEMPTS attempts"
                warn "Application may not be fully functional"
                return 1
            fi
            log "Health check attempt $ATTEMPT/$MAX_ATTEMPTS failed, retrying..."
            sleep 3
            ATTEMPT=$((ATTEMPT + 1))
        fi
    done
}

# Rollback to previous version
rollback_update() {
    error "Update failed, attempting rollback..."
    
    # Get the most recent backup
    local LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/pre-update-backup-*.tar.gz 2>/dev/null | head -n1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        log "Rolling back to backup: $LATEST_BACKUP"
        
        if command -v glass-budget-admin >/dev/null 2>&1; then
            glass-budget-admin backup-restore "$LATEST_BACKUP"
        else
            warn "glass-budget-admin not available for rollback"
            warn "Manual intervention may be required"
        fi
    else
        error "No backup found for rollback"
        error "Manual recovery may be required"
    fi
}

# Verify update
verify_update() {
    log "Verifying update..."
    
    # Check service status
    if ! systemctl is-active --quiet $SERVICE_NAME; then
        error "Service is not running after update"
        return 1
    fi
    
    # Check application version/health
    local HEALTH_RESPONSE=$(curl -s http://localhost:5001/health 2>/dev/null || echo "failed")
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
        log "Application is healthy after update"
        
        # Extract version if available
        local VERSION=$(echo "$HEALTH_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$VERSION" ]; then
            log "Application version: $VERSION"
        fi
        
        return 0
    else
        error "Application health check failed after update"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    if command -v glass-budget-admin >/dev/null 2>&1; then
        glass-budget-admin backup-cleanup 30
    else
        # Manual cleanup
        find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true
        log "Old backups cleaned up"
    fi
}

# Main update process
main() {
    log "Glass Budget Update Process Started"
    
    check_privileges
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$UPDATE_LOG")"
    
    # Check if updates are available
    if ! check_updates; then
        log "No updates available. Exiting."
        exit 0
    fi
    
    # Ask for confirmation unless --force is used
    if [[ "${1:-}" != "--force" && "${1:-}" != "-f" ]]; then
        echo
        read -p "Do you want to proceed with the update? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Update cancelled by user"
            exit 0
        fi
    fi
    
    # Create backup
    create_backup
    
    # Perform update
    if perform_update; then
        # Verify update succeeded
        if verify_update; then
            log "Update completed successfully!"
            
            # Clean up old backups
            cleanup_old_backups
            
            # Show final status
            echo
            echo -e "${GREEN}========================================${NC}"
            echo -e "${GREEN}Glass Budget Update Complete!${NC}"
            echo -e "${GREEN}========================================${NC}"
            echo
            echo "Service status: $(systemctl is-active $SERVICE_NAME)"
            echo "Version info available at: http://localhost:5001/health"
            echo "Admin commands: glass-budget-admin --help"
            echo
        else
            rollback_update
            exit 1
        fi
    else
        rollback_update
        exit 1
    fi
}

# Show help
show_help() {
    echo "Glass Budget Update Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -f, --force    Skip confirmation prompt"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                # Interactive update"
    echo "  $0 --force        # Automatic update without confirmation"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    "-h"|"--help")
        show_help
        exit 0
        ;;
    "-f"|"--force")
        main --force
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac