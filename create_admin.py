"""
CLI Utility to Create Administrator Accounts for Gnanamani College of Technology.
Usage:
  Interactive:
    python create_admin.py
  Or with arguments:
    python create_admin.py <admin_id> <name> <password>
"""

import sys
from pathlib import Path
from werkzeug.security import generate_password_hash

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.database import get_db_connection

def add_admin(admin_id, name, password):
    admin_id = admin_id.strip().upper()
    name = name.strip()

    conn = get_db_connection()
    try:
        # Check if user exists
        existing = conn.execute("SELECT id FROM users WHERE user_id = ?", (admin_id,)).fetchone()
        if existing:
            print(f"Error: User ID '{admin_id}' already exists.")
            return False

        hashed = generate_password_hash(password)
        conn.execute(
            """
            INSERT INTO users (user_id, password, name, role, department)
            VALUES (?, ?, ?, 'admin', 'ADMIN')
            """,
            (admin_id, hashed, name)
        )
        conn.commit()
        print(f"\n[SUCCESS] Administrator account created successfully!")
        print(f"Admin ID   : {admin_id}")
        print(f"Name       : {name}")
        print(f"Department : ADMIN")
        print(f"Role       : admin\n")
        return True
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        add_admin(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("=== Gnanamani College of Technology - Add Administrator ===")
        a_id = input("Enter Admin ID (e.g. ADMIN002): ").strip()
        a_name = input("Enter Full Name (e.g. Principal / IT Director): ").strip()
        a_pass = input("Enter Password: ").strip()

        if a_id and a_name and a_pass:
            add_admin(a_id, a_name, a_pass)
        else:
            print("Error: All fields are required.")
