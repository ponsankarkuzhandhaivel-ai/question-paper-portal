import sqlite3
from backend.config import DATABASE_PATH

def get_db_connection():
    """
    Establish and return a SQLite database connection with Row factory
    and Foreign Key constraints enabled.
    """
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn
