from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    accounts = db.relationship('Account', backref='user', lazy=True, cascade='all, delete-orphan')
    transactions = db.relationship('Transaction', backref='user', lazy=True, cascade='all, delete-orphan')
    bills = db.relationship('Bill', backref='user', lazy=True, cascade='all, delete-orphan')
    savings_goals = db.relationship('SavingsGoal', backref='user', lazy=True, cascade='all, delete-orphan')
    
    @property
    def loan_accounts(self):
        """Get all loan accounts for this user"""
        return [acc for acc in self.accounts if acc.is_loan_account]
    
    @property
    def total_loan_debt(self):
        """Calculate total debt across all loan accounts"""
        return sum(acc.remaining_loan_balance for acc in self.loan_accounts)

class Account(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(50), nullable=False)  # checking, savings, credit, auto_loan, mortgage, etc.
    balance = db.Column(db.Float, default=0.0)
    credit_limit = db.Column(db.Float, nullable=True)  # For credit accounts only
    current_balance = db.Column(db.Float, default=0.0)  # For credit accounts: amount currently owed/used
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    transactions = db.relationship('Transaction', backref='account', lazy=True)
    bills = db.relationship('Bill', foreign_keys='Bill.account_id', backref='account', lazy=True)
    loan_payments = db.relationship('Bill', foreign_keys='Bill.loan_account_id', backref='loan_account_ref', lazy=True)
    loan_details = db.relationship('LoanDetails', backref='account', uselist=False, cascade='all, delete-orphan')
    
    @property
    def is_loan_account(self):
        """Check if this account is a loan account"""
        return self.account_type in ['auto_loan', 'mortgage', 'personal_loan', 'student_loan']
    
    @property
    def remaining_loan_balance(self):
        """Get remaining loan balance (for loan accounts)"""
        if self.is_loan_account and self.loan_details:
            return self.loan_details.current_principal
        return 0.0
    
    @property
    def display_balance(self):
        """Get the appropriate balance to display based on account type"""
        if self.account_type == 'credit':
            return -self.current_balance  # Show as negative for what you owe
        elif self.is_loan_account:
            return -self.remaining_loan_balance  # Show as negative for what you owe
        else:
            return self.balance  # Positive for assets

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # income, expense
    date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)

class Bill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    day_of_month = db.Column(db.Integer, nullable=False)  # 1-28 (day of month it's due)
    is_paid = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_date = db.Column(db.DateTime, nullable=True)
    last_paid_month = db.Column(db.Integer, nullable=True)  # Track which month was last paid
    last_paid_year = db.Column(db.Integer, nullable=True)
    loan_account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=True)  # Link to loan account if this is a loan payment
    
    @property
    def is_loan_payment(self):
        """Check if this bill is automatically generated for a loan payment"""
        return self.loan_account_id is not None
    
    @property
    def loan_account(self):
        """Get the associated loan account if this is a loan payment"""
        if self.loan_account_id:
            return Account.query.get(self.loan_account_id)
        return None

class SavingsGoal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # e.g., "Vacation Fund", "New Computer"
    current_amount = db.Column(db.Float, default=0.0)  # Current amount saved
    target_amount = db.Column(db.Float, nullable=False)  # Target amount to save
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)  # Allow for archiving goals
    
    @property
    def percentage_complete(self):
        if self.target_amount <= 0:
            return 0
        return min((self.current_amount / self.target_amount) * 100, 100)
    
    @property
    def remaining_amount(self):
        return max(self.target_amount - self.current_amount, 0)

class LoanDetails(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    
    # Loan Terms
    original_amount = db.Column(db.Float, nullable=False)  # Original loan amount
    current_principal = db.Column(db.Float, nullable=False)  # Current principal balance
    interest_rate = db.Column(db.Float, nullable=False)  # Annual interest rate (e.g., 5.5 for 5.5%)
    loan_term_months = db.Column(db.Integer, nullable=False)  # Total loan term in months
    monthly_payment = db.Column(db.Float, nullable=False)  # Monthly payment amount
    
    # Loan Information
    loan_start_date = db.Column(db.DateTime, nullable=False)  # When the loan started
    next_payment_date = db.Column(db.DateTime, nullable=False)  # Next payment due date
    lender_name = db.Column(db.String(100), nullable=True)  # Bank/lender name
    loan_number = db.Column(db.String(50), nullable=True)  # Loan account number
    
    # Optional loan-specific fields
    property_address = db.Column(db.String(200), nullable=True)  # For mortgages
    vehicle_info = db.Column(db.String(200), nullable=True)  # For auto loans (year, make, model)
    
    # Tracking
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    @property
    def loan_progress_percentage(self):
        """Calculate what percentage of the loan has been paid off"""
        if self.original_amount <= 0:
            return 0
        paid_amount = self.original_amount - self.current_principal
        return min((paid_amount / self.original_amount) * 100, 100)
    
    @property
    def remaining_payments(self):
        """Estimate remaining payments (rough calculation)"""
        if self.monthly_payment <= 0:
            return 0
        return max(int(self.current_principal / self.monthly_payment), 0)
    
    @property
    def total_interest_paid(self):
        """Calculate total interest paid so far (estimation)"""
        paid_principal = self.original_amount - self.current_principal
        # Simple estimation - in reality this would need payment history
        return paid_principal * (self.interest_rate / 100) * 0.5
    
    @property
    def payoff_date_estimate(self):
        """Estimate when loan will be paid off"""
        try:
            from dateutil.relativedelta import relativedelta
            remaining_months = self.remaining_payments
            return self.next_payment_date + relativedelta(months=remaining_months)
        except ImportError:
            # Fallback calculation using datetime if dateutil not available
            from datetime import timedelta
            remaining_months = self.remaining_payments
            # Approximate: 30.44 days per month
            days_to_add = remaining_months * 30.44
            return self.next_payment_date + timedelta(days=days_to_add)