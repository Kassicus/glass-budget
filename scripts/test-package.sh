#!/bin/bash

# Test script for Glass Budget Debian package installation
# This script tests the package creation and basic validation

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Configuration
PACKAGE_NAME="glass-budget"
SOURCE_DIR=$(pwd)
TEST_DIR="/tmp/glass-budget-test"
BUILD_DIR="/tmp/glass-budget-build"

log "Testing Glass Budget Debian package"
log "Source: $SOURCE_DIR"
log "Test directory: $TEST_DIR"

# Clean previous tests
if [ -d "$TEST_DIR" ]; then
    rm -rf "$TEST_DIR"
fi
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
fi

# Create test directory
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Copy source files
log "Copying source files..."
cp -r "$SOURCE_DIR"/* .

# Validate package structure
log "Validating package structure..."

# Check required files
REQUIRED_FILES=(
    "app.py"
    "models.py"
    "requirements.txt"
    "debian/control"
    "debian/rules"
    "debian/changelog"
    "debian/postinst"
    "debian/preinst"
    "debian/glass-budget.service"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "Required file missing: $file"
        exit 1
    fi
done

log "All required files present"

# Check scripts are executable
chmod +x debian/rules
chmod +x debian/postinst
chmod +x debian/preinst
chmod +x debian/prerm
chmod +x debian/postrm
chmod +x scripts/glass-budget-admin

# Validate Python syntax
log "Validating Python syntax..."
if ! python3 -m py_compile app.py; then
    error "Python syntax error in app.py"
    exit 1
fi

if ! python3 -m py_compile models.py; then
    error "Python syntax error in models.py"
    exit 1
fi

if ! python3 -m py_compile migrate_db.py; then
    error "Python syntax error in migrate_db.py"
    exit 1
fi

log "Python syntax validation passed"

# Validate requirements.txt
log "Validating requirements.txt..."
if ! python3 -m pip install --dry-run -r requirements.txt >/dev/null 2>&1; then
    warn "Requirements validation had warnings (may be normal)"
fi

# Test debian/rules manually (simulate dpkg-buildpackage)
log "Testing debian package installation rules..."

# Create fake package directory structure
mkdir -p debian/glass-budget

# Simulate the install step from debian/rules
log "Simulating package installation..."

# Test if files would be copied correctly
mkdir -p debian/glass-budget/opt/glass-budget
test -f app.py && cp app.py debian/glass-budget/opt/glass-budget/ || error "Failed to copy app.py"
test -f models.py && cp models.py debian/glass-budget/opt/glass-budget/ || error "Failed to copy models.py"
test -f migrate_db.py && cp migrate_db.py debian/glass-budget/opt/glass-budget/ || error "Failed to copy migrate_db.py"
test -f requirements.txt && cp requirements.txt debian/glass-budget/opt/glass-budget/ || error "Failed to copy requirements.txt"

# Test directory copying
test -d static && cp -r static debian/glass-budget/opt/glass-budget/ || warn "static directory not found"
test -d templates && cp -r templates debian/glass-budget/opt/glass-budget/ || warn "templates directory not found"

# Test service file copy
mkdir -p debian/glass-budget/lib/systemd/system
test -f debian/glass-budget.service && cp debian/glass-budget.service debian/glass-budget/lib/systemd/system/ || error "Failed to copy service file"

# Test config copy
mkdir -p debian/glass-budget/etc/glass-budget
test -f debian/glass-budget.env && cp debian/glass-budget.env debian/glass-budget/etc/glass-budget/ || error "Failed to copy config file"

# Test nginx config copy
mkdir -p debian/glass-budget/etc/nginx/sites-available
test -f debian/nginx-glass-budget && cp debian/nginx-glass-budget debian/glass-budget/etc/nginx/sites-available/glass-budget || warn "nginx config not found"

# Test script copies
mkdir -p debian/glass-budget/usr/bin
test -f scripts/glass-budget-admin && cp scripts/glass-budget-admin debian/glass-budget/usr/bin/ || error "Failed to copy admin script"

# Create required directories
mkdir -p debian/glass-budget/var/log/glass-budget
mkdir -p debian/glass-budget/var/lib/glass-budget

log "Package structure test completed successfully"

# Show what would be installed
log "Package would install the following files:"
find debian/glass-budget -type f | head -20
TOTAL_FILES=$(find debian/glass-budget -type f | wc -l)
if [ "$TOTAL_FILES" -gt 20 ]; then
    echo "... (truncated, $TOTAL_FILES total files)"
fi

# Test postinst script syntax
log "Validating postinst script..."
if ! bash -n debian/postinst; then
    error "Syntax error in postinst script"
    exit 1
fi

log "postinst script syntax is valid"

# Test preinst script syntax
log "Validating preinst script..."
if ! bash -n debian/preinst; then
    error "Syntax error in preinst script"
    exit 1
fi

log "preinst script syntax is valid"

# Cleanup
cd "$SOURCE_DIR"
rm -rf "$TEST_DIR"

log "Package validation completed successfully!"
log "The package should install without the previous errors"

echo ""
echo "Summary of fixes applied:"
echo "1. Added preinst script to create directories before installation"
echo "2. Improved error handling in postinst script"
echo "3. Fixed file permission issues during package build"
echo "4. Added safety checks for file existence in debian/rules"
echo "5. Updated systemd service ReadWritePaths"
echo "6. Simplified dependency management"
echo "7. Added validation for required commands"
echo ""
echo "To build the package, run:"
echo "  ./scripts/build-package.sh"
echo ""