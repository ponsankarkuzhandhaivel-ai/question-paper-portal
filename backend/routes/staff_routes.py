import os
import uuid
import re
from pathlib import Path
from fastapi import APIRouter, Request, Depends, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
from backend.config import PAPERS_DIR, DEPT_ID_PREFIX, ALLOWED_EXTENSIONS
from backend.database import get_db_connection
from backend.routes.auth_helpers import staff_required, admin_required

staff_router = APIRouter(prefix="/api/staff", tags=["Staff & Admin Management"])

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_student_id(joining_year, dept_code, student_num):
    # Year: 2-digit format
    year_str = str(joining_year).strip()
    if len(year_str) == 4 and year_str.isdigit():
        yy = year_str[-2:]
    elif len(year_str) == 2 and year_str.isdigit():
        yy = year_str
    else:
        yy = "23"

    # Department 2-letter mapping
    dept_prefix = DEPT_ID_PREFIX.get(dept_code.upper(), dept_code.upper()[:2])

    # Student number: zero-padded to 3 digits (e.g. 1 -> 001, 25 -> 025)
    num_clean = re.sub(r"\D", "", str(student_num))
    if not num_clean:
        num_clean = "1"
    num_padded = num_clean.zfill(3)

    return f"{yy}{dept_prefix}{num_padded}"


@staff_router.post("/students")
async def create_student(request: Request, current_user: dict = Depends(admin_required)):
    try:
        data = await request.json()
    except Exception:
        data = {}

    if not data:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid request data."})

    name = (data.get("name") or "").strip()
    joining_year = (data.get("joining_year") or "").strip()
    department = (data.get("department") or "").strip()
    student_number = (data.get("student_number") or "").strip()
    password = (data.get("password") or "").strip()
    confirm_password = (data.get("confirm_password") or "").strip()

    if not name:
        return JSONResponse(status_code=400, content={"success": False, "message": "Student name is required."})
    if not joining_year:
        return JSONResponse(status_code=400, content={"success": False, "message": "Joining year is required."})
    if not department:
        return JSONResponse(status_code=400, content={"success": False, "message": "Department is required."})
    if not student_number:
        return JSONResponse(status_code=400, content={"success": False, "message": "Student number is required."})
    if not password:
        return JSONResponse(status_code=400, content={"success": False, "message": "Password is required."})
    if password != confirm_password:
        return JSONResponse(status_code=400, content={"success": False, "message": "Passwords do not match."})

    if not re.match(r"^\d+$", student_number):
        return JSONResponse(status_code=400, content={"success": False, "message": "Student number must be numeric."})

    conn = get_db_connection()
    try:
        dept_row = conn.execute("SELECT id, code FROM departments WHERE code = ?", (department,)).fetchone()
        if not dept_row:
            return JSONResponse(status_code=400, content={"success": False, "message": f"Department '{department}' does not exist."})

        user_id = generate_student_id(joining_year, department, student_number)

        existing_user = conn.execute("SELECT id FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if existing_user:
            return JSONResponse(status_code=409, content={"success": False, "message": "Student ID already exists."})

        hashed_password = generate_password_hash(password)
        conn.execute(
            """
            INSERT INTO users (user_id, password, name, role, department)
            VALUES (?, ?, ?, 'student', ?)
            """,
            (user_id, hashed_password, name, department)
        )
        conn.commit()

        return JSONResponse(
            status_code=201,
            content={"success": True, "message": "Student account created successfully.", "user_id": user_id}
        )
    except Exception as e:
        conn.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": f"Error creating student: {str(e)}"})
    finally:
        conn.close()


@staff_router.get("/students")
async def list_students(current_user: dict = Depends(staff_required)):
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT id, user_id, name, role, department
            FROM users
            WHERE role = 'student'
            ORDER BY user_id ASC
        """).fetchall()
        students = [dict(row) for row in rows]
        return JSONResponse(status_code=200, content={"success": True, "students": students})
    finally:
        conn.close()


@staff_router.delete("/students/{user_id}")
async def delete_student(user_id: str, current_user: dict = Depends(admin_required)):
    user_id = user_id.strip()
    conn = get_db_connection()
    try:
        user = conn.execute("SELECT id, user_id, name, role FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if not user:
            return JSONResponse(status_code=404, content={"success": False, "message": "Student account not found."})

        if user["role"] != "student":
            return JSONResponse(status_code=400, content={"success": False, "message": "The specified user is not a student account."})

        conn.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
        conn.commit()

        return JSONResponse(
            status_code=200,
            content={"success": True, "message": f"Student account '{user_id}' ({user['name']}) deleted successfully."}
        )
    except Exception as e:
        conn.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": f"Error deleting student: {str(e)}"})
    finally:
        conn.close()


@staff_router.post("/staff-members")
async def create_staff_member(request: Request, current_user: dict = Depends(admin_required)):
    try:
        data = await request.json()
    except Exception:
        data = {}

    name = (data.get("name") or "").strip()
    staff_id = (data.get("staff_id") or "").strip().upper()
    department = (data.get("department") or "").strip().upper()
    password = (data.get("password") or "").strip()
    confirm_password = (data.get("confirm_password") or "").strip()

    if not name or not staff_id or not department or not password:
        return JSONResponse(status_code=400, content={"success": False, "message": "All fields are required."})
    if password != confirm_password:
        return JSONResponse(status_code=400, content={"success": False, "message": "Passwords do not match."})

    conn = get_db_connection()
    try:
        dept_row = conn.execute("SELECT id, code FROM departments WHERE code = ?", (department,)).fetchone()
        if not dept_row:
            return JSONResponse(status_code=400, content={"success": False, "message": f"Department '{department}' does not exist."})

        existing_user = conn.execute("SELECT id FROM users WHERE user_id = ?", (staff_id,)).fetchone()
        if existing_user:
            return JSONResponse(status_code=409, content={"success": False, "message": "Staff ID already exists."})

        hashed_password = generate_password_hash(password)
        conn.execute(
            """
            INSERT INTO users (user_id, password, name, role, department)
            VALUES (?, ?, ?, 'staff', ?)
            """,
            (staff_id, hashed_password, name, department)
        )
        conn.commit()

        return JSONResponse(
            status_code=201,
            content={"success": True, "message": "Staff account created successfully.", "user_id": staff_id}
        )
    except Exception as e:
        conn.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": f"Error creating staff: {str(e)}"})
    finally:
        conn.close()


@staff_router.get("/staff-members")
async def list_staff_members(current_user: dict = Depends(staff_required)):
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT id, user_id, name, role, department
            FROM users
            WHERE role = 'staff'
            ORDER BY user_id ASC
        """).fetchall()
        staff_list = [dict(row) for row in rows]
        return JSONResponse(status_code=200, content={"success": True, "staff": staff_list})
    finally:
        conn.close()


@staff_router.delete("/staff-members/{user_id}")
async def delete_staff_member(user_id: str, current_user: dict = Depends(admin_required)):
    user_id = user_id.strip()

    # Prevent deleting self
    if user_id.upper() == (current_user.get("user_id") or "").upper():
        return JSONResponse(status_code=400, content={"success": False, "message": "You cannot delete your own account."})

    conn = get_db_connection()
    try:
        user = conn.execute("SELECT id, user_id, name, role FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if not user:
            return JSONResponse(status_code=404, content={"success": False, "message": "Staff member account not found."})

        if user["role"] != "staff":
            return JSONResponse(status_code=400, content={"success": False, "message": "The specified user is not a staff member."})

        conn.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
        conn.commit()

        return JSONResponse(
            status_code=200,
            content={"success": True, "message": f"Staff account '{user_id}' ({user['name']}) deleted successfully."}
        )
    except Exception as e:
        conn.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": f"Error deleting staff member: {str(e)}"})
    finally:
        conn.close()


@staff_router.post("/papers")
async def upload_paper(
    request: Request,
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    academic_year: str = Form(...),
    semester: str | None = Form(None),
    current_user: dict = Depends(staff_required)
):
    if not file or not file.filename:
        return JSONResponse(status_code=400, content={"success": False, "message": "No file uploaded."})

    if not allowed_file(file.filename):
        return JSONResponse(status_code=400, content={"success": False, "message": "Only PDF files are allowed (.pdf)."})

    academic_year = (academic_year or "").strip()
    if not subject_id or not academic_year:
        return JSONResponse(status_code=400, content={"success": False, "message": "Subject and Academic Year are required."})

    conn = get_db_connection()
    try:
        subject = conn.execute("""
            SELECT s.id, s.subject_code, s.subject_name, s.semester, d.code AS dept_code
            FROM subjects s
            JOIN departments d ON s.department_id = d.id
            WHERE s.id = ?
        """, (subject_id,)).fetchone()

        if not subject:
            return JSONResponse(status_code=400, content={"success": False, "message": "Selected subject does not exist."})

        original_filename = secure_filename(file.filename)
        sem_num = int(semester) if semester and semester.isdigit() else subject["semester"]
        unique_prefix = f"{uuid.uuid4().hex[:8]}_{sem_num}_{subject['subject_code']}"
        saved_filename = f"{unique_prefix}_{original_filename}"
        save_path = PAPERS_DIR / saved_filename

        content = await file.read()
        with open(save_path, "wb") as f:
            f.write(content)

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO papers (subject_id, academic_year, file_name, file_path, uploaded_by)
            VALUES (?, ?, ?, ?, ?)
        """, (
            subject["id"],
            academic_year,
            original_filename,
            str(save_path),
            current_user.get("user_id")
        ))
        conn.commit()
        paper_id = cursor.lastrowid

        return JSONResponse(
            status_code=201,
            content={
                "success": True,
                "message": "Question paper uploaded successfully.",
                "paper_id": paper_id,
                "file_name": original_filename
            }
        )
    except Exception as e:
        conn.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": f"Upload error: {str(e)}"})
    finally:
        conn.close()


@staff_router.get("/papers")
async def list_staff_papers(current_user: dict = Depends(staff_required)):
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT p.id, p.subject_id, p.academic_year, p.file_name, p.uploaded_by, p.uploaded_at,
                   s.subject_code, s.subject_name, s.semester,
                   d.code AS department_code, d.name AS department_name
            FROM papers p
            JOIN subjects s ON p.subject_id = s.id
            JOIN departments d ON s.department_id = d.id
            ORDER BY p.uploaded_at DESC
        """).fetchall()
        papers = [dict(row) for row in rows]
        return JSONResponse(status_code=200, content={"success": True, "papers": papers})
    finally:
        conn.close()


@staff_router.delete("/papers/{paper_id}")
async def delete_paper(paper_id: int, current_user: dict = Depends(staff_required)):
    conn = get_db_connection()
    try:
        paper = conn.execute("SELECT id, file_path FROM papers WHERE id = ?", (paper_id,)).fetchone()
        if not paper:
            return JSONResponse(status_code=404, content={"success": False, "message": "Question paper not found."})

        file_path_str = paper["file_path"]

        conn.execute("DELETE FROM papers WHERE id = ?", (paper_id,))
        conn.commit()

        if file_path_str:
            try:
                import gc
                gc.collect()
                p = Path(file_path_str)
                if p.exists():
                    p.unlink()
            except Exception as e:
                print(f"Warning: could not delete physical file: {e}")

        return JSONResponse(
            status_code=200,
            content={"success": True, "message": "Question paper deleted successfully."}
        )
    except Exception as e:
        conn.rollback()
        return JSONResponse(status_code=500, content={"success": False, "message": f"Error deleting paper: {str(e)}"})
    finally:
        conn.close()
