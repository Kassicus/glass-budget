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

class Account(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(50), nullable=False)  # checking, savings, credit, etc.
    balance = db.Column(db.Float, default=0.0)
    credit_limit = db.Column(db.Float, nullable=True)  # For credit accounts only
    current_balance = db.Column(db.Float, default=0.0)  # For credit accounts: amount currently owed/used
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    transactions = db.relationship('Transaction', backref='account', lazy=True)
    bills = db.relationship('Bill', backref='account', lazy=True)

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