# Budget Tracker

A modern budgeting tool built with Flask backend and glassmorphism UI design.

## Features

- 🔐 User authentication (login/register)
- 💳 Account management (checking, savings, credit, investment)
- 📊 Transaction tracking (income/expense)
- 🔄 Recurring payments management
- 🎨 Modern glassmorphism UI design
- 📱 Responsive design

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

## Installation & Setup

1. **Create virtual environment**:
   ```bash
   python3 -m venv budget_env
   source budget_env/bin/activate  # On Windows: budget_env\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Run the application**:
   ```bash
   python app.py
   ```

5. **Access the application**:
   Open your browser and go to `http://localhost:5000`

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.