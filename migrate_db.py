#!/usr/bin/env python3
"""
Database migration script to add credit account fields
"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    # Get database path
    db_path = os.environ.get('DATABASE_URL', 'sqlite:///budget.db')
    if db_path.startswith('sqlite:///'):
        db_path = db_path.replace('sqlite:///', '')
    
    print(f"Migrating database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if account table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='account'")
        if not cursor.fetchone():
            print("Account table doesn't exist. Creating tables first...")
            
            # Create all tables using raw SQL
            create_tables_sql = """
            CREATE TABLE user (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(80) NOT NULL UNIQUE,
                email VARCHAR(120) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
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
            );
            
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
            );
            
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
                FOREIGN KEY(user_id) REFERENCES user (id),
                FOREIGN KEY(account_id) REFERENCES account (id)
            );
            """
            
            for statement in create_tables_sql.strip().split(';'):
                if statement.strip():
                    cursor.execute(statement.strip())
            print("Tables created successfully!")
        else:
            # Check if columns already exist and add them if needed
            cursor.execute("PRAGMA table_info(account)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'credit_limit' not in columns:
                print("Adding credit_limit column...")
                cursor.execute("ALTER TABLE account ADD COLUMN credit_limit REAL")
            else:
                print("credit_limit column already exists")
                
            if 'current_balance' not in columns:
                print("Adding current_balance column...")
                cursor.execute("ALTER TABLE account ADD COLUMN current_balance REAL DEFAULT 0.0")
            else:
                print("current_balance column already exists")
        
        # Commit changes
        conn.commit()
        print("Database migration completed successfully!")
        
        # Show updated schema
        cursor.execute("PRAGMA table_info(account)")
        print("\nUpdated account table schema:")
        for column in cursor.fetchall():
            print(f"  {column[1]} ({column[2]})")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()