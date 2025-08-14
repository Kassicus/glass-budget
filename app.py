from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///budget.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

from models import db, User, Account, Transaction, Bill, SavingsGoal

db.init_app(app)

# Create tables if they don't exist
with app.app_context():
    db.create_all()

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    if current_user.is_authenticated:
        return render_template('dashboard.html')
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        user = User.query.filter_by(email=data['email']).first()
        
        if user and check_password_hash(user.password_hash, data['password']):
            login_user(user)
            return jsonify({'success': True, 'redirect': url_for('dashboard')})
        return jsonify({'success': False, 'message': 'Invalid credentials'})
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'success': False, 'message': 'Email already registered'})
        
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=generate_password_hash(data['password'])
        )
        
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        return jsonify({'success': True, 'redirect': url_for('dashboard')})
    
    return render_template('register.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# API Endpoints for Accounts
@app.route('/api/accounts', methods=['GET', 'POST'])
@login_required
def accounts():
    if request.method == 'GET':
        user_accounts = Account.query.filter_by(user_id=current_user.id).all()
        return jsonify([{
            'id': acc.id,
            'name': acc.name,
            'account_type': acc.account_type,
            'balance': acc.balance,
            'credit_limit': acc.credit_limit,
            'current_balance': acc.current_balance,
            'created_at': acc.created_at.isoformat()
        } for acc in user_accounts])
    
    if request.method == 'POST':
        data = request.get_json()
        account = Account(
            name=data['name'],
            account_type=data['account_type'],
            balance=float(data.get('balance', 0)),
            credit_limit=float(data['credit_limit']) if data.get('credit_limit') else None,
            current_balance=float(data.get('current_balance', 0)),
            user_id=current_user.id
        )
        db.session.add(account)
        db.session.commit()
        return jsonify({'success': True, 'id': account.id})

@app.route('/api/accounts/<int:account_id>', methods=['PUT', 'DELETE'])
@login_required
def account_detail(account_id):
    account = Account.query.filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        return jsonify({'success': False, 'message': 'Account not found'}), 404
    
    if request.method == 'PUT':
        data = request.get_json()
        account.name = data.get('name', account.name)
        account.account_type = data.get('account_type', account.account_type)
        account.balance = float(data.get('balance', account.balance))
        if 'credit_limit' in data:
            account.credit_limit = float(data['credit_limit']) if data['credit_limit'] else None
        if 'current_balance' in data:
            account.current_balance = float(data.get('current_balance', account.current_balance))
        db.session.commit()
        return jsonify({'success': True})
    
    if request.method == 'DELETE':
        db.session.delete(account)
        db.session.commit()
        return jsonify({'success': True})

# API Endpoints for Transactions
@app.route('/api/transactions', methods=['GET', 'POST'])
@login_required
def transactions():
    if request.method == 'GET':
        user_transactions = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.date.desc()).all()
        return jsonify([{
            'id': trans.id,
            'description': trans.description,
            'amount': trans.amount,
            'category': trans.category,
            'transaction_type': trans.transaction_type,
            'date': trans.date.isoformat(),
            'account_id': trans.account_id,
            'account_name': trans.account.name
        } for trans in user_transactions])
    
    if request.method == 'POST':
        data = request.get_json()
        
        # Parse date if provided, otherwise use current date
        transaction_date = datetime.utcnow()
        if 'date' in data and data['date']:
            transaction_date = datetime.strptime(data['date'], '%Y-%m-%d')
        
        transaction = Transaction(
            description=data['description'],
            amount=float(data['amount']),
            category=data['category'],
            transaction_type=data['transaction_type'],
            date=transaction_date,
            user_id=current_user.id,
            account_id=data['account_id']
        )
        
        # Update account balance
        account = Account.query.get(data['account_id'])
        if account and account.user_id == current_user.id:
            if account.account_type == 'credit':
                # For credit accounts, expenses increase current_balance (debt)
                # and income/payments decrease current_balance (paying off debt)
                if data['transaction_type'] == 'expense':
                    account.current_balance += float(data['amount'])
                else:  # income (payment toward credit)
                    account.current_balance -= float(data['amount'])
            else:
                # For regular accounts, use the existing logic
                if data['transaction_type'] == 'income':
                    account.balance += float(data['amount'])
                else:
                    account.balance -= float(data['amount'])
        
        db.session.add(transaction)
        db.session.commit()
        return jsonify({'success': True, 'id': transaction.id})

@app.route('/api/transactions/<int:transaction_id>', methods=['PUT', 'DELETE'])
@login_required
def transaction_detail(transaction_id):
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=current_user.id).first()
    if not transaction:
        return jsonify({'success': False, 'message': 'Transaction not found'}), 404
    
    if request.method == 'PUT':
        data = request.get_json()
        old_amount = transaction.amount
        old_type = transaction.transaction_type
        old_account = transaction.account
        
        # Update transaction fields
        transaction.description = data.get('description', transaction.description)
        transaction.amount = float(data.get('amount', transaction.amount))
        transaction.category = data.get('category', transaction.category)
        transaction.transaction_type = data.get('transaction_type', transaction.transaction_type)
        
        # Update date if provided
        if 'date' in data:
            transaction.date = datetime.strptime(data['date'], '%Y-%m-%d')
        
        # Handle account change
        if 'account_id' in data and int(data['account_id']) != transaction.account_id:
            new_account = Account.query.get(int(data['account_id']))
            if new_account and new_account.user_id == current_user.id:
                # Remove from old account
                if old_account.account_type == 'credit':
                    if old_type == 'expense':
                        old_account.current_balance -= old_amount
                    else:
                        old_account.current_balance += old_amount
                else:
                    if old_type == 'income':
                        old_account.balance -= old_amount
                    else:
                        old_account.balance += old_amount
                
                # Add to new account
                if new_account.account_type == 'credit':
                    if transaction.transaction_type == 'expense':
                        new_account.current_balance += transaction.amount
                    else:
                        new_account.current_balance -= transaction.amount
                else:
                    if transaction.transaction_type == 'income':
                        new_account.balance += transaction.amount
                    else:
                        new_account.balance -= transaction.amount
                
                transaction.account_id = int(data['account_id'])
        else:
            # Same account, just update the balance difference
            account = transaction.account
            if account.account_type == 'credit':
                # Reverse old transaction
                if old_type == 'expense':
                    account.current_balance -= old_amount
                else:
                    account.current_balance += old_amount
                
                # Apply new transaction
                if transaction.transaction_type == 'expense':
                    account.current_balance += transaction.amount
                else:
                    account.current_balance -= transaction.amount
            else:
                # Regular account logic
                if old_type == 'income':
                    account.balance -= old_amount
                else:
                    account.balance += old_amount
                    
                if transaction.transaction_type == 'income':
                    account.balance += transaction.amount
                else:
                    account.balance -= transaction.amount
        
        db.session.commit()
        return jsonify({'success': True})
    
    if request.method == 'DELETE':
        # Reverse the transaction from account balance
        account = transaction.account
        if account.account_type == 'credit':
            if transaction.transaction_type == 'expense':
                account.current_balance -= transaction.amount
            else:
                account.current_balance += transaction.amount
        else:
            if transaction.transaction_type == 'income':
                account.balance -= transaction.amount
            else:
                account.balance += transaction.amount
        
        db.session.delete(transaction)
        db.session.commit()
        return jsonify({'success': True})

# API Endpoints for Bills
@app.route('/api/bills', methods=['GET', 'POST'])
@login_required
def bills():
    if request.method == 'GET':
        user_bills = Bill.query.filter_by(user_id=current_user.id).order_by(Bill.day_of_month.asc()).all()
        current_date = datetime.now()
        
        bills_data = []
        for bill in user_bills:
            # Calculate if bill is paid for current month
            current_month_paid = False
            if bill.is_paid and bill.last_paid_month == current_date.month and bill.last_paid_year == current_date.year:
                current_month_paid = True
            
            # Calculate due date for current month
            current_month_due_date = datetime(current_date.year, current_date.month, min(bill.day_of_month, 28))
            
            # If the due date has passed this month and it's not paid, it's overdue
            is_overdue = current_month_due_date < current_date and not current_month_paid
            
            bills_data.append({
                'id': bill.id,
                'name': bill.name,
                'amount': bill.amount,
                'category': bill.category,
                'day_of_month': bill.day_of_month,
                'current_month_due_date': current_month_due_date.isoformat(),
                'is_paid': current_month_paid,
                'is_overdue': is_overdue,
                'is_active': bill.is_active,
                'account_id': bill.account_id,
                'account_name': bill.account.name if bill.account else None,
                'paid_date': bill.paid_date.isoformat() if bill.paid_date else None,
                'last_paid_month': bill.last_paid_month,
                'last_paid_year': bill.last_paid_year
            })
        
        return jsonify(bills_data)
    
    if request.method == 'POST':
        data = request.get_json()
        day_of_month = int(data['day_of_month'])
        
        # Validate day of month (1-28 to avoid issues with different month lengths)
        if day_of_month < 1 or day_of_month > 28:
            return jsonify({'success': False, 'message': 'Day of month must be between 1 and 28'}), 400
        
        bill = Bill(
            name=data['name'],
            amount=float(data['amount']),
            category=data['category'],
            day_of_month=day_of_month,
            user_id=current_user.id,
            account_id=int(data['account_id'])
        )
        db.session.add(bill)
        db.session.commit()
        return jsonify({'success': True, 'id': bill.id})

@app.route('/api/bills/<int:bill_id>', methods=['PUT', 'DELETE'])
@login_required
def bill_detail(bill_id):
    bill = Bill.query.filter_by(id=bill_id, user_id=current_user.id).first()
    if not bill:
        return jsonify({'success': False, 'message': 'Bill not found'}), 404
    
    if request.method == 'PUT':
        data = request.get_json()
        bill.name = data.get('name', bill.name)
        bill.amount = float(data.get('amount', bill.amount))
        bill.category = data.get('category', bill.category)
        bill.is_active = data.get('is_active', bill.is_active)
        
        if 'day_of_month' in data:
            day_of_month = int(data['day_of_month'])
            if day_of_month < 1 or day_of_month > 28:
                return jsonify({'success': False, 'message': 'Day of month must be between 1 and 28'}), 400
            bill.day_of_month = day_of_month
        
        if 'account_id' in data:
            bill.account_id = int(data['account_id'])
        
        db.session.commit()
        return jsonify({'success': True})
    
    if request.method == 'DELETE':
        db.session.delete(bill)
        db.session.commit()
        return jsonify({'success': True})

@app.route('/api/bills/<int:bill_id>/toggle-paid', methods=['POST'])
@login_required
def toggle_bill_paid(bill_id):
    bill = Bill.query.filter_by(id=bill_id, user_id=current_user.id).first()
    if not bill:
        return jsonify({'success': False, 'message': 'Bill not found'}), 404
    
    current_date = datetime.now()
    current_month_paid = bill.is_paid and bill.last_paid_month == current_date.month and bill.last_paid_year == current_date.year
    
    if not current_month_paid:
        # Mark as paid for current month
        bill.is_paid = True
        bill.paid_date = current_date
        bill.last_paid_month = current_date.month
        bill.last_paid_year = current_date.year
        
        # Create transaction when marking as paid
        transaction = Transaction(
            description=f"Bill Payment: {bill.name}",
            amount=bill.amount,
            category=bill.category,
            transaction_type='expense',
            user_id=current_user.id,
            account_id=bill.account_id
        )
        # Update account balance
        account = Account.query.get(bill.account_id)
        if account and account.user_id == current_user.id:
            if account.account_type == 'credit':
                account.current_balance += bill.amount
            else:
                account.balance -= bill.amount
        db.session.add(transaction)
        
        message = f"Bill '{bill.name}' marked as paid for {current_date.strftime('%B %Y')}"
    else:
        # Mark as unpaid for current month
        bill.is_paid = False
        bill.paid_date = None
        bill.last_paid_month = None
        bill.last_paid_year = None
        
        message = f"Bill '{bill.name}' marked as unpaid for {current_date.strftime('%B %Y')}"
    
    db.session.commit()
    return jsonify({
        'success': True, 
        'is_paid': bill.is_paid and bill.last_paid_month == current_date.month and bill.last_paid_year == current_date.year,
        'message': message
    })

@app.route('/api/bills/reset-all', methods=['POST'])
@login_required
def reset_all_bills():
    bills = Bill.query.filter_by(user_id=current_user.id).all()
    for bill in bills:
        bill.is_paid = False
        bill.paid_date = None
        bill.last_paid_month = None
        bill.last_paid_year = None
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'All bills have been reset to unpaid for all months'})

# API Endpoints for Category Management
@app.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    # Get all unique categories from transactions and bills
    transaction_categories = db.session.query(Transaction.category).filter_by(user_id=current_user.id).distinct().all()
    bill_categories = db.session.query(Bill.category).filter_by(user_id=current_user.id).distinct().all()
    
    # Combine and count usage
    categories = {}
    
    for (category,) in transaction_categories:
        if category:
            transaction_count = Transaction.query.filter_by(user_id=current_user.id, category=category).count()
            categories[category] = categories.get(category, {'transactions': 0, 'bills': 0})
            categories[category]['transactions'] = transaction_count
    
    for (category,) in bill_categories:
        if category:
            bill_count = Bill.query.filter_by(user_id=current_user.id, category=category).count()
            categories[category] = categories.get(category, {'transactions': 0, 'bills': 0})
            categories[category]['bills'] = bill_count
    
    # Format response
    result = []
    for category, counts in categories.items():
        result.append({
            'name': category,
            'transaction_count': counts['transactions'],
            'bill_count': counts['bills'],
            'total_count': counts['transactions'] + counts['bills']
        })
    
    # Sort by total usage
    result.sort(key=lambda x: x['total_count'], reverse=True)
    return jsonify(result)

@app.route('/api/categories/<category_name>/rename', methods=['POST'])
@login_required
def rename_category(category_name):
    data = request.get_json()
    new_name = data.get('new_name', '').strip()
    
    if not new_name:
        return jsonify({'success': False, 'message': 'New category name is required'}), 400
    
    # Update transactions
    Transaction.query.filter_by(user_id=current_user.id, category=category_name).update({'category': new_name})
    
    # Update bills
    Bill.query.filter_by(user_id=current_user.id, category=category_name).update({'category': new_name})
    
    db.session.commit()
    return jsonify({'success': True, 'message': f'Category renamed to "{new_name}"'})

@app.route('/api/categories/<category_name>', methods=['DELETE'])
@login_required
def delete_category(category_name):
    data = request.get_json()
    merge_into = data.get('merge_into', '').strip() if data else ''
    
    if merge_into:
        # Merge into another category
        Transaction.query.filter_by(user_id=current_user.id, category=category_name).update({'category': merge_into})
        Bill.query.filter_by(user_id=current_user.id, category=category_name).update({'category': merge_into})
        message = f'Category "{category_name}" merged into "{merge_into}"'
    else:
        # Set to "Uncategorized"
        Transaction.query.filter_by(user_id=current_user.id, category=category_name).update({'category': 'Uncategorized'})
        Bill.query.filter_by(user_id=current_user.id, category=category_name).update({'category': 'Uncategorized'})
        message = f'Category "{category_name}" removed, items moved to "Uncategorized"'
    
    db.session.commit()
    return jsonify({'success': True, 'message': message})

@app.route('/api/transactions/by-category/<category_name>', methods=['GET'])
@login_required
def transactions_by_category(category_name):
    transactions = Transaction.query.filter_by(user_id=current_user.id, category=category_name).order_by(Transaction.date.desc()).all()
    return jsonify([{
        'id': trans.id,
        'description': trans.description,
        'amount': trans.amount,
        'category': trans.category,
        'transaction_type': trans.transaction_type,
        'date': trans.date.isoformat(),
        'account_id': trans.account_id,
        'account_name': trans.account.name
    } for trans in transactions])

@app.route('/api/bills/by-category/<category_name>', methods=['GET'])
@login_required
def bills_by_category(category_name):
    bills = Bill.query.filter_by(user_id=current_user.id, category=category_name).order_by(Bill.day_of_month.asc()).all()
    current_date = datetime.now()
    
    bills_data = []
    for bill in bills:
        # Calculate if bill is paid for current month
        current_month_paid = False
        if bill.is_paid and bill.last_paid_month == current_date.month and bill.last_paid_year == current_date.year:
            current_month_paid = True
        
        # Calculate due date for current month
        current_month_due_date = datetime(current_date.year, current_date.month, min(bill.day_of_month, 28))
        
        bills_data.append({
            'id': bill.id,
            'name': bill.name,
            'amount': bill.amount,
            'category': bill.category,
            'day_of_month': bill.day_of_month,
            'current_month_due_date': current_month_due_date.isoformat(),
            'is_paid': current_month_paid,
            'is_active': bill.is_active,
            'account_id': bill.account_id,
            'account_name': bill.account.name if bill.account else None,
            'paid_date': bill.paid_date.isoformat() if bill.paid_date else None
        })
    
    return jsonify(bills_data)

# API Endpoints for Savings Goals
@app.route('/api/savings-goals', methods=['GET', 'POST'])
@login_required
def savings_goals():
    if request.method == 'GET':
        user_goals = SavingsGoal.query.filter_by(user_id=current_user.id, is_active=True).all()
        return jsonify([{
            'id': goal.id,
            'name': goal.name,
            'current_amount': goal.current_amount,
            'target_amount': goal.target_amount,
            'percentage_complete': goal.percentage_complete,
            'remaining_amount': goal.remaining_amount,
            'is_active': goal.is_active,
            'created_at': goal.created_at.isoformat()
        } for goal in user_goals])
    
    if request.method == 'POST':
        data = request.get_json()
        goal = SavingsGoal(
            name=data['name'],
            target_amount=float(data['target_amount']),
            current_amount=float(data.get('current_amount', 0)),
            user_id=current_user.id
        )
        db.session.add(goal)
        db.session.commit()
        return jsonify({'success': True, 'id': goal.id})

@app.route('/api/savings-goals/<int:goal_id>', methods=['PUT', 'DELETE'])
@login_required
def savings_goal_detail(goal_id):
    goal = SavingsGoal.query.filter_by(id=goal_id, user_id=current_user.id).first()
    if not goal:
        return jsonify({'success': False, 'message': 'Savings goal not found'}), 404
    
    if request.method == 'PUT':
        data = request.get_json()
        goal.name = data.get('name', goal.name)
        goal.target_amount = float(data.get('target_amount', goal.target_amount))
        goal.current_amount = float(data.get('current_amount', goal.current_amount))
        goal.is_active = data.get('is_active', goal.is_active)
        db.session.commit()
        return jsonify({'success': True})
    
    if request.method == 'DELETE':
        db.session.delete(goal)
        db.session.commit()
        return jsonify({'success': True})

@app.route('/api/savings-goals/<int:goal_id>/add-funds', methods=['POST'])
@login_required
def add_funds_to_goal(goal_id):
    goal = SavingsGoal.query.filter_by(id=goal_id, user_id=current_user.id).first()
    if not goal:
        return jsonify({'success': False, 'message': 'Savings goal not found'}), 404
    
    data = request.get_json()
    amount_to_add = float(data['amount'])
    
    if amount_to_add <= 0:
        return jsonify({'success': False, 'message': 'Amount must be positive'}), 400
    
    goal.current_amount += amount_to_add
    db.session.commit()
    
    return jsonify({
        'success': True,
        'new_amount': goal.current_amount,
        'percentage_complete': goal.percentage_complete,
        'remaining_amount': goal.remaining_amount,
        'message': f'Added {amount_to_add} to {goal.name}!'
    })

@app.route('/api/savings-goals/<int:goal_id>/withdraw-funds', methods=['POST'])
@login_required
def withdraw_funds_from_goal(goal_id):
    goal = SavingsGoal.query.filter_by(id=goal_id, user_id=current_user.id).first()
    if not goal:
        return jsonify({'success': False, 'message': 'Savings goal not found'}), 404
    
    data = request.get_json()
    amount_to_withdraw = float(data['amount'])
    
    if amount_to_withdraw <= 0:
        return jsonify({'success': False, 'message': 'Amount must be positive'}), 400
    
    if amount_to_withdraw > goal.current_amount:
        return jsonify({'success': False, 'message': 'Cannot withdraw more than current amount'}), 400
    
    goal.current_amount -= amount_to_withdraw
    db.session.commit()
    
    return jsonify({
        'success': True,
        'new_amount': goal.current_amount,
        'percentage_complete': goal.percentage_complete,
        'remaining_amount': goal.remaining_amount,
        'message': f'Withdrew {amount_to_withdraw} from {goal.name}!'
    })

@app.route('/api/user/profile', methods=['GET'])
@login_required
def get_user_profile():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'created_at': current_user.created_at.isoformat()
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring and load balancers"""
    try:
        # Check database connection
        db.session.execute('SELECT 1')
        
        # Basic application info
        health_info = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0',  # You can make this dynamic
            'database': 'connected',
            'uptime': 'ok'
        }
        
        return jsonify(health_info), 200
    
    except Exception as e:
        # Database connection failed
        error_info = {
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e),
            'database': 'disconnected'
        }
        
        return jsonify(error_info), 503

@app.route('/metrics', methods=['GET'])
def metrics():
    """Basic metrics endpoint for monitoring"""
    try:
        # Get basic stats
        total_users = User.query.count()
        total_accounts = Account.query.count()
        total_transactions = Transaction.query.count()
        total_bills = Bill.query.count()
        total_goals = SavingsGoal.query.count()
        
        metrics_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'users': {
                'total': total_users,
                'active_today': User.query.filter(
                    User.created_at >= datetime.utcnow() - timedelta(days=1)
                ).count()
            },
            'accounts': {
                'total': total_accounts,
                'by_type': {
                    'checking': Account.query.filter_by(account_type='checking').count(),
                    'savings': Account.query.filter_by(account_type='savings').count(),
                    'credit': Account.query.filter_by(account_type='credit').count(),
                    'investment': Account.query.filter_by(account_type='investment').count()
                }
            },
            'transactions': {
                'total': total_transactions,
                'today': Transaction.query.filter(
                    Transaction.date >= datetime.utcnow().date()
                ).count()
            },
            'bills': {
                'total': total_bills,
                'active': Bill.query.filter_by(is_active=True).count()
            },
            'savings_goals': {
                'total': total_goals,
                'active': SavingsGoal.query.filter_by(is_active=True).count()
            }
        }
        
        return jsonify(metrics_data), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Failed to collect metrics',
            'message': str(e)
        }), 500

def create_production_app():
    """Create app with production configuration"""
    # Load environment variables
    load_dotenv()
    
    # Configure for production
    if os.environ.get('FLASK_ENV') == 'production':
        app.config['DEBUG'] = False
        app.config['TESTING'] = False
        
        # Security headers
        @app.after_request
        def security_headers(response):
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'
            
            if os.environ.get('FORCE_HTTPS', 'false').lower() == 'true':
                response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            
            return response
    
    # Initialize database
    with app.app_context():
        db.create_all()
    
    return app

if __name__ == '__main__':
    production_app = create_production_app()
    
    # Get configuration from environment
    host = os.environ.get('HOST', '127.0.0.1')
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    production_app.run(host=host, port=port, debug=debug)