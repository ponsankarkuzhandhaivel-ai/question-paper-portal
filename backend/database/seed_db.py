import sys
import sqlite3
from pathlib import Path
from werkzeug.security import generate_password_hash

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import PAPERS_DIR
from backend.database import get_db_connection
from backend.database.init_db import init_db

SEED_SQL_FILE = Path(__file__).resolve().parent / "seed_subjects.sql"

def seed_db():
    # 1. Ensure DB schema exists and papers directory is created
    init_db()
    PAPERS_DIR.mkdir(parents=True, exist_ok=True)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # 2. Run seed SQL script for regulations, departments, and subjects
        if SEED_SQL_FILE.exists():
            with open(SEED_SQL_FILE, "r", encoding="utf-8") as f:
                seed_sql = f.read()
            cursor.executescript(seed_sql)

        # 3. Seed test users (Admin, Staff, and Student) with hashed passwords
        test_users = [
            {
                "user_id": "ADMIN001",
                "password": generate_password_hash("admin123"),
                "name": "System Administrator",
                "role": "admin",
                "department": "ADMIN"
            },
            {
                "user_id": "STAFF001",
                "password": generate_password_hash("staff123"),
                "name": "Staff Admin",
                "role": "staff",
                "department": "CSE"
            },
            {
                "user_id": "23CS001",
                "password": generate_password_hash("student123"),
                "name": "Test Student",
                "role": "student",
                "department": "CSE"
            }
        ]

        for user in test_users:
            cursor.execute("SELECT id FROM users WHERE user_id = ?", (user["user_id"],))
            existing = cursor.fetchone()
            if not existing:
                cursor.execute(
                    """
                    INSERT INTO users (user_id, password, name, role, department)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (user["user_id"], user["password"], user["name"], user["role"], user["department"])
                )

        conn.commit()
        print("Database seed completed successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    seed_db()
