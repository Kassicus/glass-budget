# Glass Budget

A modern budgeting tool built with Flask backend and glassmorphism UI design, featuring production-grade deployment automation.

## Features

- 🔐 User authentication (login/register)
- 💳 Account management (checking, savings, credit, investment)  
- 📊 Transaction tracking (income/expense)
- 🔄 Recurring payments management
- 💰 Comprehensive savings goals tracking
- 🎨 Modern glassmorphism UI design
- 📱 Responsive design with floating navigation
- 🚀 Production-ready CI/CD pipeline
- 📦 One-click Ubuntu Server deployment

## Tech Stack

- **Backend**: Python Flask, SQLAlchemy, Flask-Login
- **Frontend**: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript
- **Database**: SQLite (default, configurable)
- **Authentication**: Flask-Login with bcrypt password hashing

## Project Structure

```
budget-tracker/
├── app.py                 # Main Flask application
├── models.py             # Database models
├── requirements.txt      # Python dependencies
├── .env.example         # Environment variables template
├── static/
│   ├── css/
│   │   └── style.css    # Glassmorphism styling
│   └── js/
│       ├── app.js       # Common utilities
│       └── dashboard.js # Dashboard functionality
└── templates/
    ├── base.html        # Base template
    ├── index.html       # Landing page
    ├── login.html       # Login page
    ├── register.html    # Registration page
    └── dashboard.html   # Main dashboard
```

## 🚀 Production Installation (Ubuntu Server 24.04)

For production deployment on Ubuntu Server 24.04, use our automated installation:

### One-Line Installation
```bash
curl -sSL https://github.com/kassicus/glass-budget/releases/latest/download/install.sh | sudo bash
```

This will automatically:
- Install all system dependencies (Python, PostgreSQL, Nginx, SSL certificates)
- Download and install the latest Glass Budget release
- Configure systemd service for automatic startup
- Set up Nginx reverse proxy with SSL/TLS
- Create database and run migrations
- Start the application

### Manual Installation from Debian Package
```bash
# Download the latest release (replace X.X.X with the latest version number)
wget https://github.com/kassicus/glass-budget/releases/latest/download/glass-budget_X.X.X_all.deb

# Or get the download URL dynamically
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/kassicus/glass-budget/releases/latest | grep "browser_download_url.*\.deb" | head -n 1 | cut -d '"' -f 4)
wget "$DOWNLOAD_URL"

# Install the package
sudo apt install ./glass-budget_*.deb

# The service will start automatically
sudo systemctl status glass-budget
```

### Post-Installation
After installation, Glass Budget will be available at:
- **HTTP**: `http://your-server-ip`
- **HTTPS** (with SSL): `https://your-domain.com` (if domain configured)

## 🔧 Production Management

### Admin CLI Tool
```bash
# Check service status
glass-budget-admin status

# Update to latest version (with automatic rollback on failure)
sudo glass-budget-update

# Backup database
glass-budget-admin backup

# View logs
glass-budget-admin logs

# Restart service
glass-budget-admin restart

# Configure SSL with Let's Encrypt
glass-budget-admin ssl --domain yourdomain.com
```

### Manual Service Management
```bash
# Service control
sudo systemctl start glass-budget
sudo systemctl stop glass-budget
sudo systemctl restart glass-budget
sudo systemctl status glass-budget

# View logs
sudo journalctl -u glass-budget -f

# Edit configuration
sudo nano /opt/glass-budget/.env
sudo systemctl restart glass-budget
```

## 💻 Development Installation

For local development:

### Quick Setup
1. **Clone and setup**:
   ```bash
   git clone https://github.com/kassicus/glass-budget.git
   cd glass-budget
   python3 -m venv budget_env
   source budget_env/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your development settings
   ```

4. **Run application**:
   ```bash
   python app.py
   ```

5. **Access locally**:
   Open your browser to `http://localhost:5000`

### Development Tools
```bash
# Run tests
python -m pytest tests/

# Check code quality
flake8 .
bandit -r . -x tests/

# Build local package (for testing)
./scripts/build-package.sh
```

## API Endpoints

### Authentication
- `GET /` - Landing page
- `GET /login` - Login page
- `POST /login` - Authenticate user
- `GET /register` - Registration page
- `POST /register` - Create new user
- `GET /logout` - Logout user

### Accounts
- `GET /api/accounts` - Get user accounts
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/<id>` - Update account
- `DELETE /api/accounts/<id>` - Delete account

### Transactions
- `GET /api/transactions` - Get user transactions
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/<id>` - Update transaction
- `DELETE /api/transactions/<id>` - Delete transaction

### Recurring Payments
- `GET /api/recurring-payments` - Get recurring payments
- `POST /api/recurring-payments` - Create recurring payment
- `PUT /api/recurring-payments/<id>` - Update recurring payment
- `DELETE /api/recurring-payments/<id>` - Delete recurring payment

## Database Models

### User
- id, username, email, password_hash, created_at
- Relationships: accounts, transactions, recurring_payments

### Account
- id, name, account_type, balance, user_id, created_at
- Types: checking, savings, credit, investment

### Transaction
- id, description, amount, category, transaction_type, date, user_id, account_id
- Types: income, expense

### RecurringPayment
- id, name, amount, frequency, category, next_payment_date, is_active, user_id, account_id
- Frequencies: weekly, monthly, yearly

## Features

### Glassmorphism UI
- Semi-transparent cards with backdrop blur
- Gradient backgrounds with animated particles
- Smooth animations and transitions
- Responsive design for all screen sizes

### Account Management
- Create multiple accounts (checking, savings, credit, investment)
- Track balances automatically
- Edit and delete accounts
- Visual account cards with glassmorphism design

### Transaction Tracking
- Add income and expense transactions
- Categorize transactions
- Automatic balance updates
- Transaction history with filtering

### Recurring Payments
- Set up recurring bills and subscriptions
- Weekly, monthly, or yearly frequencies
- Track next payment dates
- Manage active/inactive status

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- CSRF protection ready (Flask-WTF)
- User isolation (users only see their own data)

## Development

The application is built with modern web standards:
- Semantic HTML5
- CSS Grid and Flexbox layouts
- ES6+ JavaScript with async/await
- RESTful API design
- Responsive mobile-first design

## 🔄 CI/CD Pipeline

Glass Budget includes a comprehensive CI/CD pipeline that automatically builds, tests, and deploys releases.

### Automated Release Process

1. **Create a release tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions automatically**:
   - Runs comprehensive tests (unit, integration, security)
   - Performs security scanning (bandit, semgrep, dependency checks)
   - Builds Debian package for Ubuntu Server 24.04
   - Creates installation scripts
   - Publishes GitHub release with all artifacts

### Release Artifacts

Each release includes:
- `glass-budget_v1.0.0_all.deb` - Debian package
- `install.sh` - One-line installation script
- `DEPLOYMENT.md` - Detailed deployment guide
- Source code archives

### Pipeline Features

- ✅ **Automated Testing**: Unit tests, integration tests, security scans
- ✅ **Quality Gates**: Code quality checks, dependency vulnerability scans  
- ✅ **Security Scanning**: Static analysis, secret detection, CVE checking
- ✅ **Package Building**: Automated .deb package creation
- ✅ **Release Automation**: GitHub releases with comprehensive artifacts
- ✅ **Documentation**: Auto-generated deployment guides

## 🏗️ Deployment Architecture

### Production Architecture
```
Internet → Nginx (SSL/Proxy) → Glass Budget (Flask) → PostgreSQL
                ↓
           SSL Certificates (Let's Encrypt)
                ↓
           Monitoring & Logging
```

### Security Features
- **HTTPS/TLS**: Automatic SSL certificate management
- **Reverse Proxy**: Nginx with security headers and rate limiting
- **Service Isolation**: Dedicated system user with minimal privileges
- **Database Security**: Encrypted connections, restricted access
- **System Hardening**: SELinux/AppArmor compatible, resource limits

### Monitoring & Health Checks
- **Health Endpoint**: `/health` for load balancer checks
- **Metrics Endpoint**: `/metrics` for Prometheus integration
- **Structured Logging**: JSON logs with automatic rotation
- **Service Monitoring**: Systemd integration with restart policies

## 🛠️ Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
sudo journalctl -u glass-budget -f

# Check configuration
glass-budget-admin status

# Verify database connection
glass-budget-admin test-db
```

**Database connection errors:**
```bash
# Reset database
glass-budget-admin reset-db

# Run migrations manually
glass-budget-admin migrate
```

**SSL/HTTPS issues:**
```bash
# Renew SSL certificate
glass-budget-admin ssl --renew

# Check Nginx configuration
sudo nginx -t
sudo systemctl restart nginx
```

**Performance issues:**
```bash
# Check system resources
glass-budget-admin resources

# View performance metrics
curl http://localhost:5000/metrics
```

### Support & Logs

**Important log locations:**
- Application: `sudo journalctl -u glass-budget`
- Nginx: `/var/log/nginx/glass-budget.*.log`
- System: `/var/log/glass-budget/`

**Configuration files:**
- App config: `/opt/glass-budget/.env`
- Service: `/etc/systemd/system/glass-budget.service`
- Nginx: `/etc/nginx/sites-available/glass-budget`

## 📖 Additional Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide
- **[GitHub Releases](https://github.com/kassicus/glass-budget/releases)** - Download latest version
- **[GitHub Issues](https://github.com/kassicus/glass-budget/issues)** - Report bugs or request features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing code style
4. Run tests: `python -m pytest tests/`
5. Run security checks: `bandit -r .`
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code style
- Add tests for new features
- Update documentation as needed
- Ensure all CI checks pass

## 📄 License

This project is open source and available under the MIT License.