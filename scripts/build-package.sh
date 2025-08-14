#!/bin/bash

# Build script for Glass Budget Debian package

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[BUILD]${NC} $1"
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
BUILD_DIR="/tmp/glass-budget-build"
VERSION=${VERSION:-$(date +%Y%m%d)-$(git rev-parse --short HEAD 2>/dev/null || echo "nogit")}

log "Building Glass Budget Debian package"
log "Version: $VERSION"
log "Source: $SOURCE_DIR"
log "Build directory: $BUILD_DIR"

# Clean previous builds
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
fi

# Create build directory structure
log "Setting up build environment..."
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Copy source files
log "Copying source files..."
cp -r "$SOURCE_DIR"/* .

# Update version in changelog
log "Updating package version..."
if [ -f "debian/changelog" ]; then
    # Create new changelog entry
    TEMP_CHANGELOG=$(mktemp)
    cat > "$TEMP_CHANGELOG" << EOF
$PACKAGE_NAME ($VERSION-1) unstable; urgency=medium

  * Automated build for version $VERSION
  * Built on $(date)
  * Git commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")

 -- Glass Budget CI <ci@glass-budget.local>  $(date -R)

EOF
    cat "debian/changelog" >> "$TEMP_CHANGELOG"
    mv "$TEMP_CHANGELOG" "debian/changelog"
fi

# Make scripts executable
chmod +x debian/rules
chmod +x debian/postinst
chmod +x debian/prerm
chmod +x debian/postrm
chmod +x scripts/install.sh
chmod +x scripts/glass-budget-admin

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
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error "Required file missing: $file"
        exit 1
    fi
done

# Install build dependencies (if we have sudo access)
log "Checking build dependencies..."
if sudo -n true 2>/dev/null; then
    log "Installing build dependencies..."
    sudo apt-get update
    sudo apt-get install -y \
        build-essential \
        devscripts \
        dh-make \
        fakeroot \
        lintian \
        dh-python \
        python3-all \
        python3-setuptools \
        debhelper
else
    warn "No sudo access - assuming build dependencies are already installed"
    warn "If build fails, install: build-essential devscripts dh-make fakeroot lintian dh-python python3-all debhelper"
fi

# Build the package
log "Building Debian package..."

# Build source package
if ! dpkg-buildpackage -us -uc -S; then
    error "Failed to build source package"
    exit 1
fi

# Build binary package
if ! dpkg-buildpackage -us -uc -b; then
    error "Failed to build binary package"
    exit 1
fi

# Move packages to source directory and fix permissions
log "Moving packages to source directory..."
mv ../*.deb "$SOURCE_DIR/" 2>/dev/null || warn "No .deb files found to move"
mv ../*.dsc "$SOURCE_DIR/" 2>/dev/null || warn "No .dsc files found to move"
mv ../*.tar.gz "$SOURCE_DIR/" 2>/dev/null || warn "No .tar.gz files found to move"
mv ../*.changes "$SOURCE_DIR/" 2>/dev/null || warn "No .changes files found to move"

# List what we actually have in source directory
log "Build artifacts in source directory:"
ls -la "$SOURCE_DIR"/*.deb "$SOURCE_DIR"/*.dsc "$SOURCE_DIR"/*.tar.gz "$SOURCE_DIR"/*.changes 2>/dev/null || warn "No build artifacts found"

# Fix file permissions to prevent apt access issues
log "Fixing package file permissions..."
chmod 644 "$SOURCE_DIR"/*.deb 2>/dev/null || true
chmod 644 "$SOURCE_DIR"/*.dsc 2>/dev/null || true
chmod 644 "$SOURCE_DIR"/*.tar.gz 2>/dev/null || true
chmod 644 "$SOURCE_DIR"/*.changes 2>/dev/null || true

# Run lintian checks
log "Running package quality checks..."
if command -v lintian >/dev/null 2>&1; then
    lintian "$SOURCE_DIR"/*.deb || warn "Lintian found issues (non-fatal)"
fi

# Package information
DEB_FILE=$(ls "$SOURCE_DIR"/*.deb | head -1)
if [ -f "$DEB_FILE" ]; then
    log "Package built successfully:"
    log "File: $(basename "$DEB_FILE")"
    log "Size: $(du -h "$DEB_FILE" | cut -f1)"
    
    # Show package contents
    log "Package contents:"
    if ! dpkg -c "$DEB_FILE" | head -20; then
        warn "Could not display package contents (non-fatal)"
    else
        TOTAL_FILES=$(dpkg -c "$DEB_FILE" 2>/dev/null | wc -l || echo "unknown")
        if [[ "$TOTAL_FILES" =~ ^[0-9]+$ ]] && [ "$TOTAL_FILES" -gt 20 ]; then
            echo "... (truncated, $TOTAL_FILES total files)"
        fi
    fi
    
    # Show package info
    log "Package information:"
    if ! dpkg -I "$DEB_FILE"; then
        warn "Could not display package information (non-fatal)"
    fi
else
    error "No package file found after build"
    exit 1
fi

# Cleanup build directory
log "Cleaning up build directory..."
cd "$SOURCE_DIR"
rm -rf "$BUILD_DIR"

log "Build completed successfully!"
log "Package files created in: $SOURCE_DIR"

# List all created files
echo "Created files:"
ls -la "$SOURCE_DIR"/*.deb "$SOURCE_DIR"/*.dsc "$SOURCE_DIR"/*.tar.gz "$SOURCE_DIR"/*.changes 2>/dev/null | while read -r line; do
    echo "  $line"
done