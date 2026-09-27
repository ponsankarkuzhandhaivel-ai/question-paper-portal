import sys
import sqlite3
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import DATABASE_PATH, PAPERS_DIR
from backend.database import get_db_connection

INIT_SCHEMA_SQL = """
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);

-- 2. Regulations Table
CREATE TABLE IF NOT EXISTS regulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);

-- 3. Users Table (Supports student, staff, and admin)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'staff', 'admin')),
    department TEXT NOT NULL
);

-- 4. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    regulation_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    semester INTEGER NOT NULL,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    FOREIGN KEY (regulation_id) REFERENCES regulations(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE(regulation_id, department_id, semester, subject_code)
);

-- 5. Papers Table
CREATE TABLE IF NOT EXISTS papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    academic_year TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_filter ON subjects(regulation_id, department_id, semester);
CREATE INDEX IF NOT EXISTS idx_papers_subject ON papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(academic_year);
"""

def migrate_users_role_constraint(conn):
    cursor = conn.cursor()
    row = cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").fetchone()
    if row and row["sql"] and "'admin'" not in row["sql"]:
        print("Migrating users table to support 'admin' role...")
        cursor.execute("PRAGMA foreign_keys = OFF;")
        cursor.execute("""
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('student', 'staff', 'admin')),
                department TEXT NOT NULL
            );
        """)
        cursor.execute("""
            INSERT INTO users_new (id, user_id, password, name, role, department)
            SELECT id, user_id, password, name, role, department FROM users;
        """)
        cursor.execute("DROP TABLE users;")
        cursor.execute("ALTER TABLE users_new RENAME TO users;")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);")
        cursor.execute("PRAGMA foreign_keys = ON;")
        conn.commit()
        print("Migration to support 'admin' role completed.")

def init_db():
    # Ensure papers folder exists
    PAPERS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Ensure database directory exists
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = get_db_connection()
    try:
        with conn:
            conn.executescript(INIT_SCHEMA_SQL)
        migrate_users_role_constraint(conn)
        print("Database initialized successfully.")
        print(f"Database location: {DATABASE_PATH}")
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
