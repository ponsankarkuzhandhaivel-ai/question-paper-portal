import os
import pathlib

# Base directory: project root (Question-Paper-Portal/)
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent

# Database configuration
DATABASE_PATH = BASE_DIR / "question_portal.db"

# PDF storage directory
PAPERS_DIR = BASE_DIR / "papers"

# Ensure papers directory exists
PAPERS_DIR.mkdir(parents=True, exist_ok=True)

# Secret key for Flask sessions
SECRET_KEY = os.environ.get("SECRET_KEY", "gnanamani_gct_question_paper_portal_secret_key_2024")

# Upload constraints
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload size
ALLOWED_EXTENSIONS = {"pdf"}

# Session configuration
SESSION_COOKIE_NAME = "gct_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = False  # Set to True in production HTTPS
PERMANENT_SESSION_LIFETIME = 86400  # 24 hours in seconds

# Department Code to Student ID mapping
# Example: 2023 + CSE + 001 => 23 + CS + 001 => 23CS001
DEPT_ID_PREFIX = {
    "CSE": "CS",
    "ECE": "EC",
    "EEE": "EE",
    "MECH": "ME",
    "AI&DS": "AD",
    "BME": "BM",
    "AGRI": "AG",
    "PHARMA": "PH",
    "IT": "IT"
}
