# Glass Budget Production Deployment Guide

This document provides comprehensive instructions for deploying Glass Budget in production environments, specifically targeting Ubuntu Server 24.04.

## Table of Contents

- [Overview](#overview)
- [Quick Installation](#quick-installation)
- [CI/CD Pipeline](#cicd-pipeline)
- [Manual Installation](#manual-installation)
- [Configuration](#configuration)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Overview

Glass Budget includes a complete CI/CD pipeline and production-ready deployment system featuring:

- **Automated Debian packaging** for Ubuntu Server 24.04
- **Systemd service management** with security hardening
- **Nginx reverse proxy** with SSL/TLS support
- **PostgreSQL database** support with automatic migrations
- **Automated backups** and update mechanisms
- **Health monitoring** and metrics collection
- **Log rotation** and management
- **Security headers** and rate limiting

## Quick Installation

### One-Line Install

For a complete automated installation on Ubuntu Server 24.04:

```bash
curl -sSL https://github.com/kassicus/glass-budget/releases/latest/download/install.sh | sudo bash
```

### Package-Based Install

1. Download the latest package:
```bash
# Get the latest release download URL
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/kassicus/glass-budget/releases/latest | grep "browser_download_url.*\.deb" | head -n 1 | cut -d '"' -f 4)
wget "$DOWNLOAD_URL"
```

2. Install the package:
```bash
sudo apt install ./glass-budget_*.deb
```

3. Follow the post-installation configuration prompts.

## CI/CD Pipeline

### GitHub Actions Workflow

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that:

1. **Testing Phase:**
   - Runs unit tests with pytest
   - Performs security scanning with bandit and semgrep
   - Checks dependencies for vulnerabilities
   - Validates code quality with flake8

2. **Build Phase:**
   - Creates Debian packages for Ubuntu Server
   - Generates installation scripts
   - Creates release artifacts

3. **Release Phase:**
   - Automatically creates GitHub releases for tags
   - Uploads packages and scripts
   - Provides installation instructions

### Triggering Releases

To create a new release:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# The CI/CD pipeline will automatically:
# - Build the package
# - Run all tests
# - Create a GitHub release
# - Upload installation files
```

### Build Process

The build process creates:
- `glass-budget_X.X.X_all.deb` - Main installation package
- `install.sh` - Automated installation script
- Source packages for distribution

## Manual Installation

### Prerequisites

Ubuntu Server 24.04 with:
- Python 3.11+
- PostgreSQL (optional, SQLite used by default)
- Nginx (configured automatically)

### Step-by-Step Installation

1. **System Update:**
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Install Dependencies:**
```bash
sudo apt install -y python3 python3-venv postgresql nginx
```

3. **Download and Install Package:**
```bash
# Get the latest release download URL
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/kassicus/glass-budget/releases/latest | grep "browser_download_url.*\.deb" | head -n 1 | cut -d '"' -f 4)
wget "$DOWNLOAD_URL"
sudo apt install ./glass-budget_*.deb
```

4. **Configure Database (Optional):**
```bash
# For PostgreSQL (recommended for production)
sudo -u postgres createdb glass_budget
sudo -u postgres createuser glass_budget --pwprompt
```

5. **Configure Application:**
```bash
sudo nano /etc/glass-budget/glass-budget.env
# Update DATABASE_URL and other settings
```

6. **Enable and Start Services:**
```bash
sudo systemctl enable glass-budget nginx
sudo systemctl start glass-budget nginx
```

## Configuration

### Main Configuration File

Location: `/etc/glass-budget/glass-budget.env`

```bash
# Security - CHANGE THIS!
SECRET_KEY=your-secure-secret-key-here

# Database Configuration
# SQLite (default):
DATABASE_URL=sqlite:////var/lib/glass-budget/budget.db
# PostgreSQL (recommended):
# DATABASE_URL=postgresql://glass_budget:password@localhost:5432/glass_budget

# Application Settings
FLASK_ENV=production
FLASK_DEBUG=false
HOST=127.0.0.1
PORT=5001

# Security Settings
FORCE_HTTPS=true
SESSION_COOKIE_SECURE=true
```

### Nginx Configuration

Location: `/etc/nginx/sites-available/glass-budget`

Key features:
- SSL/TLS termination with Let's Encrypt support
- Rate limiting for security
- Static file serving with caching
- Security headers
- Gzip compression

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/glass-budget /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### SSL/TLS Configuration

Install SSL certificate with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Systemd Service

Location: `/lib/systemd/system/glass-budget.service`

Features:
- Automatic restart on failure
- Security hardening (NoNewPrivileges, ProtectSystem, etc.)
- Resource limits
- Proper logging

## Monitoring & Maintenance

### Health Checks

Check application health:
```bash
curl http://localhost:5001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-08-14T12:00:00Z",
  "version": "1.0.0",
  "database": "connected"
}
```

### Metrics

View application metrics:
```bash
curl http://localhost:5001/metrics
```

### Administrative Commands

The `glass-budget-admin` command provides comprehensive management:

```bash
# Service management
glass-budget-admin status
glass-budget-admin restart
glass-budget-admin logs

# Backup management
glass-budget-admin backup
glass-budget-admin backup-list
glass-budget-admin backup-restore /path/to/backup.tar.gz

# Configuration
glass-budget-admin config-edit
glass-budget-admin config-validate

# Health checks
glass-budget-admin health

# Database operations
glass-budget-admin database-migrate
```

### Updates

Update to the latest version:
```bash
sudo glass-budget-update
```

The update process:
1. Creates automatic backups
2. Downloads and installs updates
3. Runs database migrations
4. Performs health checks
5. Rolls back on failure

### Backup Strategy

Automated backups are created:
- Before each update
- Daily via cron (if configured)
- On-demand via admin commands

Backup locations:
- Database: `/var/lib/glass-budget/backups/`
- Configuration: Included in backups
- Retention: 30 days (configurable)

### Log Management

Log locations:
- Application: `/var/log/glass-budget/`
- Nginx: `/var/log/nginx/glass-budget-*.log`
- System: `journalctl -u glass-budget`

Log rotation is configured via `/etc/logrotate.d/glass-budget`.

## Security

### Security Features

1. **Application Security:**
   - CSRF protection
   - Password hashing with bcrypt
   - Session security
   - SQL injection protection via SQLAlchemy
   - XSS protection headers

2. **System Security:**
   - Systemd security hardening
   - Non-root user execution
   - File system protection
   - Network isolation options

3. **Web Security:**
   - Rate limiting
   - SSL/TLS encryption
   - Security headers
   - Static file protection

### Firewall Configuration

Configure UFW firewall:
```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw --force enable
```

### Regular Security Updates

Enable automatic security updates:
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

### Common Issues

1. **Service Won't Start:**
```bash
# Check service status
sudo systemctl status glass-budget

# Check logs
sudo journalctl -u glass-budget -n 50

# Validate configuration
glass-budget-admin config-validate
```

2. **Database Connection Issues:**
```bash
# Test database connection
glass-budget-admin health

# Run migrations
glass-budget-admin database-migrate

# Check database service
sudo systemctl status postgresql
```

3. **Nginx Configuration:**
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/glass-budget-error.log
```

4. **SSL Certificate Issues:**
```bash
# Renew certificates
sudo certbot renew

# Test certificate renewal
sudo certbot renew --dry-run
```

### Performance Tuning

1. **Database Optimization:**
   - Use PostgreSQL for production
   - Configure connection pooling
   - Regular maintenance with `VACUUM` and `ANALYZE`

2. **Web Server Optimization:**
   - Enable gzip compression
   - Configure proper caching headers
   - Use CDN for static assets

3. **Application Optimization:**
   - Monitor memory usage
   - Configure appropriate worker processes
   - Use Redis for session storage (optional)

### Getting Help

1. **Check Logs:**
   - Application: `glass-budget-admin logs`
   - System: `sudo journalctl -u glass-budget`
   - Web server: `/var/log/nginx/`

2. **Health Diagnostics:**
   ```bash
   glass-budget-admin health
   ```

3. **Configuration Validation:**
   ```bash
   glass-budget-admin config-validate
   ```

4. **GitHub Issues:**
   Report issues at: https://github.com/kassicus/glass-budget/issues

## File Locations Reference

| Component | Location |
|-----------|----------|
| Application | `/opt/glass-budget/` |
| Configuration | `/etc/glass-budget/glass-budget.env` |
| Data | `/var/lib/glass-budget/` |
| Logs | `/var/log/glass-budget/` |
| Service | `/lib/systemd/system/glass-budget.service` |
| Nginx Config | `/etc/nginx/sites-available/glass-budget` |
| Admin Script | `/usr/bin/glass-budget-admin` |
| Update Script | `/usr/bin/glass-budget-update` |

## Support Matrix

| OS | Version | Status |
|----|---------|--------|
| Ubuntu Server | 24.04 LTS | ✅ Fully Supported |
| Ubuntu Server | 22.04 LTS | ⚠️ Should work (untested) |
| Debian | 12 | ⚠️ Should work (untested) |

---

*This deployment guide is part of the Glass Budget project. For the latest version, visit the GitHub repository.*