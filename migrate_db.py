#!/usr/bin/env python3
"""
Production-ready database migration script for Glass Budget
Supports SQLite, PostgreSQL, and MySQL databases
"""

import os
import sys
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/var/log/glass-budget/migration.log')
    ] if os.path.exists('/var/log/glass-budget') else [logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

def detect_database_type(database_url):
    """Detect database type from URL"""
    if database_url.startswith('postgresql://') or database_url.startswith('postgres://'):
        return 'postgresql'
    elif database_url.startswith('mysql://'):
        return 'mysql'
    elif database_url.startswith('sqlite://'):
        return 'sqlite'
    else:
        return 'sqlite'  # Default to SQLite

def migrate_sqlite(db_path):
    """Migrate SQLite database"""
    import sqlite3
    
    logger.info(f"Migrating SQLite database: {db_path}")
    
    # Ensure directory exists
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check existing tables and create if missing
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='account'")
        if not cursor.fetchone():
            logger.info("Creating tables from scratch...")
            create_all_tables_sqlite(cursor)
        else:
            logger.info("Updating existing tables...")
            # Update existing tables
            update_existing_tables_sqlite(cursor)
        
        conn.commit()
        logger.info("SQLite migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during SQLite migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def migrate_postgresql(database_url):
    """Migrate PostgreSQL database"""
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        logger.info("Migrating PostgreSQL database")
        
        # Parse database URL
        parsed = urlparse(database_url)
        
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path[1:],  # Remove leading slash
            user=parsed.username,
            password=parsed.password
        )
        
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'account'
        """)
        
        if not cursor.fetchone():
            logger.info("Creating PostgreSQL tables...")
            create_all_tables_postgresql(cursor)
        else:
            logger.info("Updating existing PostgreSQL tables...")
            update_existing_tables_postgresql(cursor)
        
        conn.commit()
        logger.info("PostgreSQL migration completed successfully!")
        
    except ImportError:
        logger.error("psycopg2 not installed. Please install: pip install psycopg2-binary")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error during PostgreSQL migration: {e}")
        raise
    finally:
        if 'conn' in locals():
            conn.close()

def create_all_tables_sqlite(cursor):
    """Create all tables for SQLite"""
    tables = [
        """
        CREATE TABLE user (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(80) NOT NULL UNIQUE,
            email VARCHAR(120) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE account (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            account_type VARCHAR(50) NOT NULL,
            balance REAL DEFAULT 0.0,
            credit_limit REAL,
            current_balance REAL DEFAULT 0.0,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES user (id)
        )
        """,
        """
        CREATE TABLE "transaction" (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            description VARCHAR(200) NOT NULL,
            amount REAL NOT NULL,
            category VARCHAR(50) NOT NULL,
            transaction_type VARCHAR(20) NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES user (id),
            FOREIGN KEY(account_id) REFERENCES account (id)
        )
        """,
        """
        CREATE TABLE bill (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            amount REAL NOT NULL,
            category VARCHAR(50) NOT NULL,
            day_of_month INTEGER NOT NULL,
            is_paid BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            paid_date DATETIME,
            last_paid_month INTEGER,
            last_paid_year INTEGER,
            loan_account_id INTEGER,
            FOREIGN KEY(user_id) REFERENCES user (id),
            FOREIGN KEY(account_id) REFERENCES account (id),
            FOREIGN KEY(loan_account_id) REFERENCES account (id)
        )
        """,
        """
        CREATE TABLE savings_goal (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            current_amount REAL DEFAULT 0.0,
            target_amount REAL NOT NULL,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            FOREIGN KEY(user_id) REFERENCES user (id)
        )
        """,
        """
        CREATE TABLE loan_details (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            original_amount REAL NOT NULL,
            current_principal REAL NOT NULL,
            interest_rate REAL NOT NULL,
            loan_term_months INTEGER NOT NULL,
            monthly_payment REAL NOT NULL,
            loan_start_date DATETIME NOT NULL,
            next_payment_date DATETIME NOT NULL,
            lender_name VARCHAR(100),
            loan_number VARCHAR(50),
            property_address VARCHAR(200),
            vehicle_info VARCHAR(200),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(account_id) REFERENCES account (id)
        )
        """
    ]
    
    for table_sql in tables:
        cursor.execute(table_sql.strip())
        logger.info(f"Created table")

def update_existing_tables_sqlite(cursor):
    """Update existing SQLite tables with new columns"""
    # Check account table columns
    cursor.execute("PRAGMA table_info(account)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'credit_limit' not in columns:
        logger.info("Adding credit_limit column to account table...")
        cursor.execute("ALTER TABLE account ADD COLUMN credit_limit REAL")
    
    if 'current_balance' not in columns:
        logger.info("Adding current_balance column to account table...")
        cursor.execute("ALTER TABLE account ADD COLUMN current_balance REAL DEFAULT 0.0")
    
    # Check bill table columns for loan support
    cursor.execute("PRAGMA table_info(bill)")
    bill_columns = [column[1] for column in cursor.fetchall()]
    
    if 'loan_account_id' not in bill_columns:
        logger.info("Adding loan_account_id column to bill table...")
        cursor.execute("ALTER TABLE bill ADD COLUMN loan_account_id INTEGER REFERENCES account(id)")
        logger.info("loan_account_id column added successfully")
    
    # Check if savings_goal table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='savings_goal'")
    if not cursor.fetchone():
        logger.info("Creating savings_goal table...")
        cursor.execute("""
            CREATE TABLE savings_goal (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                current_amount REAL DEFAULT 0.0,
                target_amount REAL NOT NULL,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY(user_id) REFERENCES user (id)
            )
        """)
    
    # Check if loan_details table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='loan_details'")
    if not cursor.fetchone():
        logger.info("Creating loan_details table...")
        cursor.execute("""
            CREATE TABLE loan_details (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                original_amount REAL NOT NULL,
                current_principal REAL NOT NULL,
                interest_rate REAL NOT NULL,
                loan_term_months INTEGER NOT NULL,
                monthly_payment REAL NOT NULL,
                loan_start_date DATETIME NOT NULL,
                next_payment_date DATETIME NOT NULL,
                lender_name VARCHAR(100),
                loan_number VARCHAR(50),
                property_address VARCHAR(200),
                vehicle_info VARCHAR(200),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(account_id) REFERENCES account (id)
            )
        """)

def create_all_tables_postgresql(cursor):
    """Create all tables for PostgreSQL"""
    tables = [
        """
        CREATE TABLE "user" (
            id SERIAL PRIMARY KEY,
            username VARCHAR(80) NOT NULL UNIQUE,
            email VARCHAR(120) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE account (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            account_type VARCHAR(50) NOT NULL,
            balance DECIMAL(10,2) DEFAULT 0.0,
            credit_limit DECIMAL(10,2),
            current_balance DECIMAL(10,2) DEFAULT 0.0,
            user_id INTEGER NOT NULL REFERENCES "user"(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE "transaction" (
            id SERIAL PRIMARY KEY,
            description VARCHAR(200) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            category VARCHAR(50) NOT NULL,
            transaction_type VARCHAR(20) NOT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER NOT NULL REFERENCES "user"(id),
            account_id INTEGER NOT NULL REFERENCES account(id)
        )
        """,
        """
        CREATE TABLE bill (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            category VARCHAR(50) NOT NULL,
            day_of_month INTEGER NOT NULL,
            is_paid BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            user_id INTEGER NOT NULL REFERENCES "user"(id),
            account_id INTEGER NOT NULL REFERENCES account(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_date TIMESTAMP,
            last_paid_month INTEGER,
            last_paid_year INTEGER,
            loan_account_id INTEGER REFERENCES account(id)
        )
        """,
        """
        CREATE TABLE savings_goal (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            current_amount DECIMAL(10,2) DEFAULT 0.0,
            target_amount DECIMAL(10,2) NOT NULL,
            user_id INTEGER NOT NULL REFERENCES "user"(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
        """,
        """
        CREATE TABLE loan_details (
            id SERIAL PRIMARY KEY,
            account_id INTEGER NOT NULL REFERENCES account(id),
            original_amount DECIMAL(10,2) NOT NULL,
            current_principal DECIMAL(10,2) NOT NULL,
            interest_rate DECIMAL(5,2) NOT NULL,
            loan_term_months INTEGER NOT NULL,
            monthly_payment DECIMAL(10,2) NOT NULL,
            loan_start_date TIMESTAMP NOT NULL,
            next_payment_date TIMESTAMP NOT NULL,
            lender_name VARCHAR(100),
            loan_number VARCHAR(50),
            property_address VARCHAR(200),
            vehicle_info VARCHAR(200),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    ]
    
    for table_sql in tables:
        cursor.execute(table_sql.strip())
        logger.info("Created PostgreSQL table")

def update_existing_tables_postgresql(cursor):
    """Update existing PostgreSQL tables"""
    # Check if columns exist and add if needed
    try:
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'account' AND column_name = 'credit_limit'
        """)
        if not cursor.fetchone():
            logger.info("Adding credit_limit column to account table...")
            cursor.execute("ALTER TABLE account ADD COLUMN credit_limit DECIMAL(10,2)")
        
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'account' AND column_name = 'current_balance'
        """)
        if not cursor.fetchone():
            logger.info("Adding current_balance column to account table...")
            cursor.execute("ALTER TABLE account ADD COLUMN current_balance DECIMAL(10,2) DEFAULT 0.0")
        
        # Check bill table for loan support
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'bill' AND column_name = 'loan_account_id'
        """)
        if not cursor.fetchone():
            logger.info("Adding loan_account_id column to bill table...")
            cursor.execute("ALTER TABLE bill ADD COLUMN loan_account_id INTEGER REFERENCES account(id)")
        
        # Check if savings_goal table exists
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'savings_goal'
        """)
        if not cursor.fetchone():
            logger.info("Creating savings_goal table...")
            cursor.execute("""
                CREATE TABLE savings_goal (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    current_amount DECIMAL(10,2) DEFAULT 0.0,
                    target_amount DECIMAL(10,2) NOT NULL,
                    user_id INTEGER NOT NULL REFERENCES "user"(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            """)
        
        # Check if loan_details table exists
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'loan_details'
        """)
        if not cursor.fetchone():
            logger.info("Creating loan_details table...")
            cursor.execute("""
                CREATE TABLE loan_details (
                    id SERIAL PRIMARY KEY,
                    account_id INTEGER NOT NULL REFERENCES account(id),
                    original_amount DECIMAL(10,2) NOT NULL,
                    current_principal DECIMAL(10,2) NOT NULL,
                    interest_rate DECIMAL(5,2) NOT NULL,
                    loan_term_months INTEGER NOT NULL,
                    monthly_payment DECIMAL(10,2) NOT NULL,
                    loan_start_date TIMESTAMP NOT NULL,
                    next_payment_date TIMESTAMP NOT NULL,
                    lender_name VARCHAR(100),
                    loan_number VARCHAR(50),
                    property_address VARCHAR(200),
                    vehicle_info VARCHAR(200),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
    except Exception as e:
        logger.warning(f"Some updates may have failed: {e}")

def migrate_database():
    """Main migration function that handles all database types"""
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///budget.db')
    db_type = detect_database_type(database_url)
    
    logger.info(f"Starting database migration for {db_type}")
    logger.info(f"Database URL: {database_url}")
    
    try:
        if db_type == 'postgresql':
            migrate_postgresql(database_url)
        elif db_type == 'mysql':
            logger.error("MySQL support not yet implemented")
            sys.exit(1)
        else:  # SQLite
            db_path = database_url.replace('sqlite:///', '')
            migrate_sqlite(db_path)
        
        logger.info("Migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)

def backup_database():
    """Create a backup of the database before migration"""
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///budget.db')
    db_type = detect_database_type(database_url)
    
    if db_type == 'sqlite':
        db_path = database_url.replace('sqlite:///', '')
        if os.path.exists(db_path):
            backup_path = f"{db_path}.backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            import shutil
            shutil.copy2(db_path, backup_path)
            logger.info(f"Database backed up to: {backup_path}")
            return backup_path
    else:
        logger.info("Automatic backup not supported for non-SQLite databases")
        logger.info("Please create a manual backup before running migrations")
    
    return None

if __name__ == "__main__":
    migrate_database()