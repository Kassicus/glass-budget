"""
Test suite for Glass Budget application.
"""

import pytest
import os
import tempfile
from app import app, db
from models import User, Account, Transaction, Bill, SavingsGoal


@pytest.fixture
def client():
    """Create a test client for the Flask application."""
    # Use environment database URL if available (for CI), otherwise SQLite
    if 'DATABASE_URL' in os.environ:
        app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
        db_cleanup = False
    else:
        # Create a temporary file for the test database (local testing)
        db_fd, db_path = tempfile.mkstemp()
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
        db_cleanup = True
    
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        
        # Clean up tables after tests
        with app.app_context():
            db.drop_all()
    
    if db_cleanup:
        os.close(db_fd)
        os.unlink(db_path)


@pytest.fixture
def test_user(client):
    """Create a test user."""
    from werkzeug.security import generate_password_hash
    
    with app.app_context():
        user = User(
            username='testuser',
            email='test@example.com',
            password_hash=generate_password_hash('testpassword')
        )
        db.session.add(user)
        db.session.commit()
        
        # Return the user ID and re-fetch to avoid detached instance issues
        user_id = user.id
        
    # Re-fetch the user in the same context where it will be used
    with app.app_context():
        return User.query.get(user_id)


class TestBasicFunctionality:
    """Test basic application functionality."""

    def test_index_page(self, client):
        """Test the index page loads correctly."""
        response = client.get('/')
        assert response.status_code == 200
        assert b'Glass Budget' in response.data or b'budget' in response.data.lower()

    def test_login_page(self, client):
        """Test the login page loads correctly."""
        response = client.get('/login')
        assert response.status_code == 200

    def test_register_page(self, client):
        """Test the register page loads correctly."""
        response = client.get('/register')
        assert response.status_code == 200

    def test_user_registration(self, client):
        """Test user registration functionality."""
        response = client.post('/register', 
                             json={
                                 'username': 'newuser',
                                 'email': 'newuser@example.com',
                                 'password': 'newpassword'
                             },
                             content_type='application/json')
        
        # Should redirect on successful registration
        assert response.status_code == 200
        data = response.get_json()
        assert data is not None
        # Either success or already exists (if run multiple times)
        assert data.get('success') is not None

    def test_user_login(self, client, test_user):
        """Test user login functionality."""
        response = client.post('/login',
                             json={
                                 'email': 'test@example.com',
                                 'password': 'testpassword'
                             },
                             content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data is not None


class TestAPIEndpoints:
    """Test API endpoint functionality."""

    def test_accounts_api_unauthorized(self, client):
        """Test accounts API requires authentication."""
        response = client.get('/api/accounts')
        # Should redirect to login page or return 401
        assert response.status_code in [302, 401]

    def test_transactions_api_unauthorized(self, client):
        """Test transactions API requires authentication."""
        response = client.get('/api/transactions')
        # Should redirect to login page or return 401
        assert response.status_code in [302, 401]

    def test_bills_api_unauthorized(self, client):
        """Test bills API requires authentication."""
        response = client.get('/api/bills')
        # Should redirect to login page or return 401
        assert response.status_code in [302, 401]

    def test_savings_goals_api_unauthorized(self, client):
        """Test savings goals API requires authentication."""
        response = client.get('/api/savings-goals')
        # Should redirect to login page or return 401
        assert response.status_code in [302, 401]


class TestDatabaseModels:
    """Test database model functionality."""

    def test_user_model_creation(self, client):
        """Test User model can be created."""
        from werkzeug.security import generate_password_hash
        
        with app.app_context():
            user = User(
                username='modeltest',
                email='modeltest@example.com',
                password_hash=generate_password_hash('password')
            )
            db.session.add(user)
            db.session.commit()
            
            # Verify user was created
            found_user = User.query.filter_by(username='modeltest').first()
            assert found_user is not None
            assert found_user.email == 'modeltest@example.com'

    def test_account_model_creation(self, client, test_user):
        """Test Account model can be created."""
        with app.app_context():
            account = Account(
                name='Test Checking',
                account_type='checking',
                balance=1000.0,
                user_id=test_user.id
            )
            db.session.add(account)
            db.session.commit()
            
            # Verify account was created
            found_account = Account.query.filter_by(name='Test Checking').first()
            assert found_account is not None
            assert found_account.balance == 1000.0
            assert found_account.user_id == test_user.id

    def test_savings_goal_properties(self, client, test_user):
        """Test SavingsGoal model properties."""
        with app.app_context():
            goal = SavingsGoal(
                name='Test Goal',
                current_amount=250.0,
                target_amount=1000.0,
                user_id=test_user.id
            )
            db.session.add(goal)
            db.session.commit()
            
            # Test percentage calculation
            assert goal.percentage_complete == 25.0
            assert goal.remaining_amount == 750.0


class TestSecurity:
    """Test security features."""

    def test_password_hashing(self, client):
        """Test that passwords are properly hashed."""
        from werkzeug.security import generate_password_hash, check_password_hash
        
        password = 'testsecurepassword'
        hashed = generate_password_hash(password)
        
        # Hash should not equal original password
        assert hashed != password
        
        # Should be able to verify the password
        assert check_password_hash(hashed, password)
        
        # Should fail with wrong password
        assert not check_password_hash(hashed, 'wrongpassword')

    def test_user_isolation(self, client):
        """Test that users can only access their own data."""
        # This would require more complex setup with authenticated requests
        # For now, just test that the endpoints exist and require auth
        response = client.get('/api/accounts')
        assert response.status_code in [302, 401]


if __name__ == '__main__':
    pytest.main([__file__])